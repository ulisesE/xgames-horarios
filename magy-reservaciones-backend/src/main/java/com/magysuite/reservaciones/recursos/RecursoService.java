package com.magysuite.reservaciones.recursos;

import com.magysuite.reservaciones.core.tenant.TenantContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RecursoService {

    private final RecursoRepository recursoRepository;

    @Autowired
    public RecursoService(RecursoRepository recursoRepository) {
        this.recursoRepository = recursoRepository;
    }

    public List<Recurso> listarPorNegocio(boolean soloActivos) {
        String tenantId = TenantContext.getCurrentTenant();
        if (soloActivos) {
            return recursoRepository.findByNegocioIdAndActivoTrue(tenantId);
        }
        return recursoRepository.findByNegocioId(tenantId);
    }

    public Optional<Recurso> obtenerPorId(Long id) {
        return recursoRepository.findById(id)
                .filter(r -> r.getNegocioId().equals(TenantContext.getCurrentTenant()));
    }

    public Recurso crear(Recurso recurso) {
        recurso.setNegocioId(TenantContext.getCurrentTenant());
        return recursoRepository.save(recurso);
    }

    public Recurso actualizar(Long id, Recurso datos) {
        return obtenerPorId(id)
                .map(recurso -> {
                    recurso.setNombre(datos.getNombre());
                    recurso.setTipo(datos.getTipo());
                    recurso.setActivo(datos.getActivo());
                    return recursoRepository.save(recurso);
                })
                .orElseThrow(() -> new RuntimeException("Recurso no encontrado con ID: " + id));
    }
}
