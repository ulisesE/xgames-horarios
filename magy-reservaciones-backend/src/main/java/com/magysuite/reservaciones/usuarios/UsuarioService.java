package com.magysuite.reservaciones.usuarios;

import com.magysuite.reservaciones.core.tenant.TenantContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    @Autowired
    public UsuarioService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public List<Usuario> listarPorNegocio() {
        String tenantId = TenantContext.getCurrentTenant();
        return usuarioRepository.findByNegocioId(tenantId);
    }

    public Optional<Usuario> obtenerPorUsername(String username) {
        String tenantId = TenantContext.getCurrentTenant();
        return usuarioRepository.findByNegocioIdAndUsername(tenantId, username);
    }

    @Transactional
    public Usuario registrar(Usuario usuario) {
        String tenantId = TenantContext.getCurrentTenant();
        usuario.setNegocioId(tenantId);

        if (usuarioRepository.existsByNegocioIdAndUsername(tenantId, usuario.getUsername())) {
            throw new IllegalArgumentException("El usuario ya existe en este negocio");
        }

        // Si es CLIENTE, aseguramos que tenga PIN
        if ("CLIENTE".equalsIgnoreCase(usuario.getRol())) {
            if (usuario.getPin() == null || usuario.getPin().trim().isEmpty()) {
                throw new IllegalArgumentException("El PIN es obligatorio para clientes");
            }
            usuario.setPasswordHash(null); // No usa contraseña tradicional
        } else {
            // Si es ADMIN, aseguramos que tenga password
            if (usuario.getPasswordHash() == null || usuario.getPasswordHash().trim().isEmpty()) {
                throw new IllegalArgumentException("La contraseña es obligatoria para administradores");
            }
            usuario.setPin(null);
        }

        // Guardar primero para obtener el ID
        Usuario savedUser = usuarioRepository.save(usuario);

        // Si es cliente, crear un perfil vacío asociado
        if ("CLIENTE".equalsIgnoreCase(savedUser.getRol())) {
            PerfilCliente perfil = new PerfilCliente();
            perfil.setUsuarioId(savedUser.getId());
            perfil.setUsuario(savedUser);
            perfil.setNick(savedUser.getUsername().toUpperCase());
            perfil.setNivel("");
            perfil.setCancionesFavoritas("");
            perfil.setColorNeon("Magenta");
            savedUser.setPerfil(perfil);
            return usuarioRepository.save(savedUser);
        }

        return savedUser;
    }

    @Transactional
    public Optional<Usuario> login(String username, String credentials, String rol) {
        String tenantId = TenantContext.getCurrentTenant();
        Optional<Usuario> userOpt = usuarioRepository.findByNegocioIdAndUsername(tenantId, username);

        if (userOpt.isPresent()) {
            Usuario usuario = userOpt.get();
            if ("ADMIN".equalsIgnoreCase(rol) && "ADMIN".equalsIgnoreCase(usuario.getRol())) {
                // Validación simple de contraseña
                if (credentials.equals(usuario.getPasswordHash())) {
                    return Optional.of(usuario);
                }
            } else if ("CLIENTE".equalsIgnoreCase(rol) && "CLIENTE".equalsIgnoreCase(usuario.getRol())) {
                // Validación de PIN
                if (credentials.equals(usuario.getPin())) {
                    return Optional.of(usuario);
                }
            }
        }
        return Optional.empty();
    }

    @Transactional
    public Usuario actualizarPerfil(String username, PerfilCliente datosPerfil) {
        String tenantId = TenantContext.getCurrentTenant();
        Usuario usuario = usuarioRepository.findByNegocioIdAndUsername(tenantId, username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + username));

        if (!"CLIENTE".equalsIgnoreCase(usuario.getRol())) {
            throw new IllegalArgumentException("Solo los clientes tienen ficha de juego/perfil");
        }

        PerfilCliente perfil = usuario.getPerfil();
        if (perfil == null) {
            perfil = new PerfilCliente();
            perfil.setUsuarioId(usuario.getId());
            perfil.setUsuario(usuario);
        }

        perfil.setNick(datosPerfil.getNick());
        perfil.setNivel(datosPerfil.getNivel());
        perfil.setCancionesFavoritas(datosPerfil.getCancionesFavoritas());
        perfil.setColorNeon(datosPerfil.getColorNeon());

        usuario.setPerfil(perfil);
        if (datosPerfil.getUsuario() != null && datosPerfil.getUsuario().getTelefono() != null) {
            usuario.setTelefono(datosPerfil.getUsuario().getTelefono());
        }

        return usuarioRepository.save(usuario);
    }
}
