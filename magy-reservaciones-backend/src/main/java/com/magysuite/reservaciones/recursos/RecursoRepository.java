package com.magysuite.reservaciones.recursos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecursoRepository extends JpaRepository<Recurso, Long> {
    List<Recurso> findByNegocioId(String negocioId);
    List<Recurso> findByNegocioIdAndActivoTrue(String negocioId);
}
