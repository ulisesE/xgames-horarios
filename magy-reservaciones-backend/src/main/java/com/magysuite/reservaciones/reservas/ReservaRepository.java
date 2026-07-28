package com.magysuite.reservaciones.reservas;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReservaRepository extends JpaRepository<Reserva, Long> {
    List<Reserva> findByNegocioIdAndFecha(String negocioId, LocalDate fecha);

    List<Reserva> findByNegocioIdAndFechaBetween(String negocioId, LocalDate startDate, LocalDate endDate);

    List<Reserva> findByNegocioIdAndClienteId(String negocioId, Long clienteId);

    @Query("SELECT r FROM Reserva r WHERE r.negocioId = :negocioId AND r.recurso.id = :recursoId AND r.fecha = :fecha AND r.estado = 'APROBADA'")
    List<Reserva> findConflictCandidates(
            @Param("negocioId") String negocioId,
            @Param("recursoId") Long recursoId,
            @Param("fecha") LocalDate fecha
    );
}
