package com.magysuite.reservaciones.negocios;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class NegocioService {

    private final NegocioRepository negocioRepository;

    @Autowired
    public NegocioService(NegocioRepository negocioRepository) {
        this.negocioRepository = negocioRepository;
    }

    public List<Negocio> listarTodos() {
        return negocioRepository.findAll();
    }

    public Optional<Negocio> obtenerPorId(String id) {
        return negocioRepository.findById(id);
    }

    public Optional<Negocio> obtenerPorSubdominio(String subdominio) {
        return negocioRepository.findBySubdominio(subdominio);
    }

    public Negocio registrar(Negocio negocio) {
        if (negocio.getId() == null || negocio.getId().trim().isEmpty()) {
            throw new IllegalArgumentException("El ID del negocio no puede estar vacío");
        }
        if (negocioRepository.existsById(negocio.getId())) {
            throw new IllegalArgumentException("Ya existe un negocio con este ID: " + negocio.getId());
        }
        return negocioRepository.save(negocio);
    }

    public Negocio actualizar(String id, Negocio datos) {
        return negocioRepository.findById(id)
                .map(negocio -> {
                    negocio.setNombre(datos.getNombre());
                    negocio.setLogoUrl(datos.getLogoUrl());
                    negocio.setEstado(datos.getEstado());
                    return negocioRepository.save(negocio);
                })
                .orElseThrow(() -> new RuntimeException("Negocio no encontrado con ID: " + id));
    }
}
