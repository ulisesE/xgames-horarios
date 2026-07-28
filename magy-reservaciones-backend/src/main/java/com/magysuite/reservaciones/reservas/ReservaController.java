package com.magysuite.reservaciones.reservas;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reservas")
@CrossOrigin(origins = "*")
public class ReservaController {

    private final ReservaService reservaService;

    @Autowired
    public ReservaController(ReservaService reservaService) {
        this.reservaService = reservaService;
    }

    @GetMapping
    public ResponseEntity<List<Reserva>> obtenerReservas(
            @RequestParam(value = "fecha", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(value = "inicio", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(value = "fin", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin,
            @RequestParam(value = "clienteId", required = false) Long clienteId) {

        if (fecha != null) {
            return ResponseEntity.ok(reservaService.listarPorFecha(fecha));
        } else if (inicio != null && fin != null) {
            return ResponseEntity.ok(reservaService.listarPorRangoFechas(inicio, fin));
        } else if (clienteId != null) {
            return ResponseEntity.ok(reservaService.listarPorCliente(clienteId));
        }
        // Retornar las de hoy por defecto si no se manda nada
        return ResponseEntity.ok(reservaService.listarPorFecha(LocalDate.now()));
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Reserva reserva) {
        try {
            return ResponseEntity.ok(reservaService.crearReserva(reserva));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<?> actualizarEstado(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String estado = body.get("estado");
        if (estado == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "El campo 'estado' es obligatorio"));
        }
        try {
            return ResponseEntity.ok(reservaService.actualizarEstado(id, estado));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/pago")
    public ResponseEntity<?> marcarPago(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        Boolean pagado = body.get("pagado");
        if (pagado == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "El campo 'pagado' es obligatorio"));
        }
        try {
            return ResponseEntity.ok(reservaService.marcarPago(id, pagado));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // --- Endpoints de Días Cerrados ---

    @GetMapping("/dias-cerrados")
    public ResponseEntity<List<DiaCerrado>> listarDiasCerrados() {
        return ResponseEntity.ok(reservaService.listarDiasCerrados());
    }

    @PostMapping("/dias-cerrados")
    public ResponseEntity<?> agregarDiaCerrado(@RequestBody DiaCerrado diaCerrado) {
        try {
            return ResponseEntity.ok(reservaService.agregarDiaCerrado(diaCerrado));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/dias-cerrados/{id}")
    public ResponseEntity<?> eliminarDiaCerrado(@PathVariable Long id) {
        try {
            reservaService.eliminarDiaCerrado(id);
            return ResponseEntity.ok().body(Map.of("success", true, "message", "Día cerrado eliminado correctamente"));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
