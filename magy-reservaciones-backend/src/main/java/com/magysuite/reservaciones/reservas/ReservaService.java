package com.magysuite.reservaciones.reservas;

import com.magysuite.reservaciones.core.tenant.TenantContext;
import com.magysuite.reservaciones.recursos.RecursoService;
import com.magysuite.reservaciones.usuarios.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Service
public class ReservaService {

    private final ReservaRepository reservaRepository;
    private final DiaCerradoRepository diaCerradoRepository;
    private final RecursoService recursoService;
    private final UsuarioService usuarioService;

    @Autowired
    public ReservaService(ReservaRepository reservaRepository,
                          DiaCerradoRepository diaCerradoRepository,
                          RecursoService recursoService,
                          UsuarioService usuarioService) {
        this.reservaRepository = reservaRepository;
        this.diaCerradoRepository = diaCerradoRepository;
        this.recursoService = recursoService;
        this.usuarioService = usuarioService;
    }

    public List<Reserva> listarPorFecha(LocalDate fecha) {
        String tenantId = TenantContext.getCurrentTenant();
        return reservaRepository.findByNegocioIdAndFecha(tenantId, fecha);
    }

    public List<Reserva> listarPorRangoFechas(LocalDate inicio, LocalDate fin) {
        String tenantId = TenantContext.getCurrentTenant();
        return reservaRepository.findByNegocioIdAndFechaBetween(tenantId, inicio, fin);
    }

    public List<Reserva> listarPorCliente(Long clienteId) {
        String tenantId = TenantContext.getCurrentTenant();
        return reservaRepository.findByNegocioIdAndClienteId(tenantId, clienteId);
    }

    @Transactional
    public Reserva crearReserva(Reserva reserva) {
        String tenantId = TenantContext.getCurrentTenant();
        reserva.setNegocioId(tenantId);

        // Validar que el recurso exista y pertenezca al negocio
        if (reserva.getRecurso() == null || reserva.getRecurso().getId() == null) {
            throw new IllegalArgumentException("El recurso es obligatorio");
        }
        var recurso = recursoService.obtenerPorId(reserva.getRecurso().getId())
                .orElseThrow(() -> new IllegalArgumentException("Recurso no válido o no pertenece al negocio"));
        reserva.setRecurso(recurso);

        // Validar que el cliente exista si no es un bloqueo de mantenimiento
        if (!reserva.getEsMantenimiento()) {
            if (reserva.getCliente() == null || reserva.getCliente().getUsername() == null) {
                throw new IllegalArgumentException("El cliente es obligatorio para reservas normales");
            }
            var cliente = usuarioService.obtenerPorUsername(reserva.getCliente().getUsername())
                    .orElseThrow(() -> new IllegalArgumentException("Cliente no registrado en este negocio"));
            reserva.setCliente(cliente);
        } else {
            reserva.setCliente(null);
            reserva.setEstado("APROBADA"); // Bloqueos administrativos se aprueban de inmediato
        }

        // Validar si el día está cerrado
        if (diaCerradoRepository.existsByNegocioIdAndFecha(tenantId, reserva.getFecha())) {
            throw new IllegalArgumentException("No se pueden realizar reservas: El local estará cerrado este día");
        }

        // Validar traslapes de horarios
        validarTraslapes(reserva);

        return reservaRepository.save(reserva);
    }

    @Transactional
    public Reserva actualizarEstado(Long id, String nuevoEstado) {
        String tenantId = TenantContext.getCurrentTenant();
        Reserva reserva = reservaRepository.findById(id)
                .filter(r -> r.getNegocioId().equals(tenantId))
                .orElseThrow(() -> new RuntimeException("Reserva no encontrada con ID: " + id));

        String estadoAnterior = reserva.getEstado();
        reserva.setEstado(nuevoEstado);

        // Si se aprueba la reserva, rechazar automáticamente las que se traslapen y estén pendientes
        if ("APROBADA".equalsIgnoreCase(nuevoEstado)) {
            // Validar traslapes antes de aprobar
            validarTraslapes(reserva);

            // Cancelar/Rechazar solicitudes pendientes en conflicto
            rechazarPendientesEnConflicto(reserva);
        }

        return reservaRepository.save(reserva);
    }

    @Transactional
    public Reserva marcarPago(Long id, boolean pagado) {
        String tenantId = TenantContext.getCurrentTenant();
        Reserva reserva = reservaRepository.findById(id)
                .filter(r -> r.getNegocioId().equals(tenantId))
                .orElseThrow(() -> new RuntimeException("Reserva no encontrada con ID: " + id));

        reserva.setPagado(pagado);
        return reservaRepository.save(reserva);
    }

    private void validarTraslapes(Reserva nuevaReserva) {
        LocalTime inicioNueva = nuevaReserva.getHoraInicio();
        LocalTime finNueva = nuevaReserva.getHoraFin();

        List<Reserva> aprobadas = reservaRepository.findConflictCandidates(
                nuevaReserva.getNegocioId(),
                nuevaReserva.getRecurso().getId(),
                nuevaReserva.getFecha()
        );

        for (Reserva existente : aprobadas) {
            // Ignorar la misma reserva si se está actualizando
            if (existente.getId().equals(nuevaReserva.getId())) {
                continue;
            }

            LocalTime inicioExistente = existente.getHoraInicio();
            LocalTime finExistente = existente.getHoraFin();

            // Lógica de traslape: inicioNueva < finExistente && finNueva > inicioExistente
            if (inicioNueva.isBefore(finExistente) && finNueva.isAfter(inicioExistente)) {
                throw new IllegalArgumentException("Conflicto de horario: Ya existe una reserva aprobada (" 
                        + existente.getNota() + ") de " + inicioExistente + " a " + finExistente);
            }
        }
    }

    private void rechazarPendientesEnConflicto(Reserva reservaAprobada) {
        String tenantId = TenantContext.getCurrentTenant();
        List<Reserva> todas = reservaRepository.findByNegocioIdAndFecha(tenantId, reservaAprobada.getFecha());
        
        LocalTime inicioAprobada = reservaAprobada.getHoraInicio();
        LocalTime finAprobada = reservaAprobada.getHoraFin();

        for (Reserva r : todas) {
            if (r.getId().equals(reservaAprobada.getId())) {
                continue;
            }

            if ("PENDIENTE".equalsIgnoreCase(r.getEstado()) && r.getRecurso().getId().equals(reservaAprobada.getRecurso().getId())) {
                LocalTime inicioPendiente = r.getHoraInicio();
                LocalTime finPendiente = r.getHoraFin();

                if (inicioPendiente.isBefore(finAprobada) && finPendiente.isAfter(inicioAprobada)) {
                    r.setEstado("RECHAZADA");
                    r.setNota("Rechazada automáticamente por conflicto con reserva aprobada ID: " + reservaAprobada.getId());
                    reservaRepository.save(r);
                }
            }
        }
    }

    // --- Gestión de Días Cerrados ---

    public List<DiaCerrado> listarDiasCerrados() {
        String tenantId = TenantContext.getCurrentTenant();
        return diaCerradoRepository.findByNegocioId(tenantId);
    }

    @Transactional
    public DiaCerrado agregarDiaCerrado(DiaCerrado diaCerrado) {
        String tenantId = TenantContext.getCurrentTenant();
        diaCerrado.setNegocioId(tenantId);

        if (diaCerradoRepository.existsByNegocioIdAndFecha(tenantId, diaCerrado.getFecha())) {
            throw new IllegalArgumentException("Ya está registrado el cierre para esta fecha");
        }

        // Al cerrar el día, rechazar/cancelar todas las reservas existentes que estén PENDIENTES o APROBADAS
        List<Reserva> reservasDelDia = reservaRepository.findByNegocioIdAndFecha(tenantId, diaCerrado.getFecha());
        for (Reserva r : reservasDelDia) {
            if ("PENDIENTE".equalsIgnoreCase(r.getEstado()) || "APROBADA".equalsIgnoreCase(r.getEstado())) {
                r.setEstado("RECHAZADA");
                r.setNota("Cancelada por cierre del local: " + diaCerrado.getMotivo());
                reservaRepository.save(r);
            }
        }

        return diaCerradoRepository.save(diaCerrado);
    }

    @Transactional
    public void eliminarDiaCerrado(Long id) {
        String tenantId = TenantContext.getCurrentTenant();
        diaCerradoRepository.findById(id)
                .filter(d -> d.getNegocioId().equals(tenantId))
                .ifPresentOrElse(
                        diaCerradoRepository::delete,
                        () -> { throw new RuntimeException("Día cerrado no encontrado con ID: " + id); }
                );
    }
}
