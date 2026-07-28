package com.magysuite.reservaciones.negocios;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "negocios")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Negocio {
    @Id
    private String id; // ID único (ej: "xgames-barcade")

    @Column(nullable = false)
    private String nombre;

    @Column(unique = true)
    private String subdominio;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(nullable = false)
    private String estado = "ACTIVO"; // ACTIVO, SUSPENDIDO

    @Column(name = "fecha_registro", updatable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();
}
