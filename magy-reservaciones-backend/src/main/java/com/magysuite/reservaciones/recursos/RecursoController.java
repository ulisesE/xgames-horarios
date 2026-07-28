package com.magysuite.reservaciones.recursos;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recursos")
@CrossOrigin(origins = "*")
public class RecursoController {

    private final RecursoService recursoService;

    @Autowired
    public RecursoController(RecursoService recursoService) {
        this.recursoService = recursoService;
    }

    @GetMapping
    public ResponseEntity<List<Recurso>> listar(@RequestParam(value = "soloActivos", defaultValue = "true") boolean soloActivos) {
        return ResponseEntity.ok(recursoService.listarPorNegocio(soloActivos));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Recurso> obtenerPorId(@PathVariable Long id) {
        return recursoService.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Recurso> crear(@RequestBody Recurso recurso) {
        return ResponseEntity.ok(recursoService.crear(recurso));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Recurso recurso) {
        try {
            return ResponseEntity.ok(recursoService.actualizar(id, recurso));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
