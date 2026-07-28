-- ============================================================================
-- SCRIPT DE CREACIÓN DE BASE DE DATOS: MAGY RESERVACIONES (MAGY SUITE)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `magy_reservaciones_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `magy_reservaciones_db`;

-- 1. Tabla de Negocios / Inquilinos (Tenants)
CREATE TABLE IF NOT EXISTS `negocios` (
    `id` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `subdominio` VARCHAR(50) UNIQUE,
    `logo_url` VARCHAR(255),
    `estado` VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    `fecha_registro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de Usuarios (Administradores y Clientes)
CREATE TABLE IF NOT EXISTS `usuarios` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `negocio_id` VARCHAR(50) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NULL, -- Nulo para clientes si usan PIN
    `pin` VARCHAR(10) NULL, -- PIN de 4 dígitos para clientes
    `rol` VARCHAR(20) NOT NULL DEFAULT 'CLIENTE',
    `nombre_completo` VARCHAR(100),
    `telefono` VARCHAR(20),
    `fecha_registro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_usuario_negocio` (`negocio_id`, `username`),
    CONSTRAINT `fk_usuarios_negocios` FOREIGN KEY (`negocio_id`) REFERENCES `negocios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de Fichas/Perfiles de Clientes (Específico para Arcade/Baile, extensible)
CREATE TABLE IF NOT EXISTS `clientes_perfil` (
    `usuario_id` BIGINT NOT NULL,
    `nick` VARCHAR(50),
    `nivel` VARCHAR(20),
    `canciones_favoritas` TEXT,
    `color_neon` VARCHAR(30) DEFAULT 'Magenta',
    PRIMARY KEY (`usuario_id`),
    CONSTRAINT `fk_perfil_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de Recursos Reservables (Máquinas, mesas, salas, etc.)
CREATE TABLE IF NOT EXISTS `recursos` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `negocio_id` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `tipo` VARCHAR(50) NOT NULL DEFAULT 'ARCADE', -- ARCADE, MESA, PISTA, etc.
    `activo` BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_recursos_negocios` FOREIGN KEY (`negocio_id`) REFERENCES `negocios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla de Reservas / Horarios
CREATE TABLE IF NOT EXISTS `reservas` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `negocio_id` VARCHAR(50) NOT NULL,
    `recurso_id` BIGINT NOT NULL,
    `cliente_id` BIGINT, -- Nulo si es bloqueo administrativo
    `fecha` DATE NOT NULL,
    `hora_inicio` TIME NOT NULL,
    `duracion_minutos` INT NOT NULL DEFAULT 30,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE, APROBADA, RECHAZADA, CANCELADA
    `pagado` BOOLEAN DEFAULT FALSE,
    `es_mantenimiento` BOOLEAN DEFAULT FALSE,
    `nota` VARCHAR(255),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_reservas_negocios` FOREIGN KEY (`negocio_id`) REFERENCES `negocios` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_reservas_recursos` FOREIGN KEY (`recurso_id`) REFERENCES `recursos` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_reservas_usuarios` FOREIGN KEY (`cliente_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabla de Días Cerrados / Feriados
CREATE TABLE IF NOT EXISTS `dias_cerrados` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `negocio_id` VARCHAR(50) NOT NULL,
    `fecha` DATE NOT NULL,
    `motivo` VARCHAR(255),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_dias_cerrados_fecha` (`negocio_id`, `fecha`),
    CONSTRAINT `fk_dias_cerrados_negocios` FOREIGN KEY (`negocio_id`) REFERENCES `negocios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
