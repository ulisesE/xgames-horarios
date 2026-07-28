package com.magysuite.reservaciones.reservas;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "dias_cerrados", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"negocio_id", "fecha"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DiaCerrado {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "negocio_id", nullable = false)
    private String negocioId;

    @Column(nullable = false)
    private LocalDate fecha;

    private String motivo;
}
