package com.magysuite.reservaciones.usuarios;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "*")
public class UsuarioController {

    private final UsuarioService usuarioService;

    @Autowired
    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public ResponseEntity<List<Usuario>> listar() {
        return ResponseEntity.ok(usuarioService.listarPorNegocio());
    }

    @PostMapping("/registrar")
    public ResponseEntity<?> registrar(@RequestBody Usuario usuario) {
        try {
            return ResponseEntity.ok(usuarioService.registrar(usuario));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String rol = body.get("rol"); // ADMIN o CLIENTE
        String credentials = "ADMIN".equalsIgnoreCase(rol) ? body.get("password") : body.get("pin");

        if (username == null || credentials == null || rol == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Faltan campos obligatorios en el login"));
        }

        return usuarioService.login(username, credentials, rol)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body((Usuario) null)); // O retornar mapa de error
    }

    @GetMapping("/perfil/{username}")
    public ResponseEntity<?> obtenerPerfil(@PathVariable String username) {
        return usuarioService.obtenerPorUsername(username)
                .map(u -> {
                    if (!"CLIENTE".equalsIgnoreCase(u.getRol())) {
                        return ResponseEntity.badRequest().body(Map.of("error", "El usuario no es un cliente"));
                    }
                    return ResponseEntity.ok(u.getPerfil() != null ? u.getPerfil() : Map.of());
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/perfil/{username}")
    public ResponseEntity<?> actualizarPerfil(@PathVariable String username, @RequestBody PerfilCliente perfil) {
        try {
            return ResponseEntity.ok(usuarioService.actualizarPerfil(username, perfil));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
