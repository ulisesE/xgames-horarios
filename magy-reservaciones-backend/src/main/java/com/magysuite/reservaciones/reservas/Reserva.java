package com.magysuite.reservaciones.reservas;

import com.magysuite.reservaciones.recursos.Recurso;
import com.magysuite.reservaciones.usuarios.Usuario;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "reservas")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Reserva {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "negocio_id", nullable = false)
    private String negocioId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "recurso_id", nullable = false)
    private Recurso recurso;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cliente_id")
    private Usuario cliente; // Nulo si es bloqueo administrativo (mantenimiento)

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "duracion_minutos", nullable = false)
    private Integer duracionMinutos = 30;

    @Column(nullable = false, length = 20)
    private String estado = "PENDIENTE"; // PENDIENTE, APROBADA, RECHAZADA, CANCELADA

    @Column(nullable = false)
    private Boolean pagado = false;

    @Column(name = "es_mantenimiento", nullable = false)
    private Boolean esMantenimiento = false;

    @Column(length = 255)
    private String nota;

    public LocalTime getHoraFin() {
        return horaInicio.plusMinutes(duracionMinutos);
    }
}
