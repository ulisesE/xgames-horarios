package com.magysuite.reservaciones.usuarios;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.ToString;

@Entity
@Table(name = "clientes_perfil")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "usuario")
public class PerfilCliente {
    @Id
    @Column(name = "usuario_id")
    private Long usuarioId;

    private String nick;
    private String nivel;

    @Column(name = "canciones_favoritas", columnDefinition = "TEXT")
    private String cancionesFavoritas;

    @Column(name = "color_neon", length = 30)
    private String colorNeon = "Magenta";

    @OneToOne
    @MapsId
    @JoinColumn(name = "usuario_id")
    @JsonIgnore
    private Usuario usuario;
}
