package com.magysuite.reservaciones.usuarios;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByNegocioIdAndUsername(String negocioId, String username);
    List<Usuario> findByNegocioId(String negocioId);
    boolean existsByNegocioIdAndUsername(String negocioId, String username);
}
