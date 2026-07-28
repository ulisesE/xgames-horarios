package com.magysuite.reservaciones.reservas;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DiaCerradoRepository extends JpaRepository<DiaCerrado, Long> {
    List<DiaCerrado> findByNegocioId(String negocioId);
    Optional<DiaCerrado> findByNegocioIdAndFecha(String negocioId, LocalDate fecha);
    boolean existsByNegocioIdAndFecha(String negocioId, LocalDate fecha);
}
