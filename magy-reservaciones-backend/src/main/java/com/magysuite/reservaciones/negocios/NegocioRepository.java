package com.magysuite.reservaciones.negocios;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NegocioRepository extends JpaRepository<Negocio, String> {
    Optional<Negocio> findBySubdominio(String subdominio);
}
