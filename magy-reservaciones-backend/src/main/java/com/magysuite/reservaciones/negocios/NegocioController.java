package com.magysuite.reservaciones.negocios;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/negocios")
@CrossOrigin(origins = "*")
public class NegocioController {

    private final NegocioService negocioService;

    @Autowired
    public NegocioController(NegocioService negocioService) {
        this.negocioService = negocioService;
    }

    @GetMapping
    public ResponseEntity<List<Negocio>> listar() {
        return ResponseEntity.ok(negocioService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Negocio> obtenerPorId(@PathVariable String id) {
        return negocioService.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/subdominio/{subdominio}")
    public ResponseEntity<Negocio> obtenerPorSubdominio(@PathVariable String subdominio) {
        return negocioService.obtenerPorSubdominio(subdominio)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Negocio> registrar(@RequestBody Negocio negocio) {
        try {
            return ResponseEntity.ok(negocioService.registrar(negocio));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Negocio> actualizar(@PathVariable String id, @RequestBody Negocio negocio) {
        try {
            return ResponseEntity.ok(negocioService.actualizar(id, negocio));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
