package com.magysuite.reservaciones.usuarios;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"negocio_id", "username"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "negocio_id", nullable = false)
    private String negocioId;

    @Column(nullable = false, length = 50)
    private String username;

    @Column(name = "password_hash")
    private String passwordHash; // Para Admins

    @Column(length = 10)
    private String pin; // PIN de 4 dígitos para Clientes

    @Column(nullable = false, length = 20)
    private String rol = "CLIENTE"; // ADMIN, CLIENTE

    @Column(name = "nombre_completo", length = 100)
    private String nombreCompleto;

    @Column(length = 20)
    private String telefono;

    @Column(name = "fecha_registro", updatable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    @OneToOne(mappedBy = "usuario", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private PerfilCliente perfil;
}
