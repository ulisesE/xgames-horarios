USE `magy_reservaciones_db`;

-- 1. Insertar Negocio Demo
INSERT INTO `negocios` (`id`, `nombre`, `subdominio`, `logo_url`, `estado`)
VALUES ('xgames-barcade', 'XGames Barcade', 'xgames', '', 'ACTIVO')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- 2. Insertar Administrador por Defecto
-- Nota: En producción el password_hash debe encriptarse (ej. BCrypt). Para el demo inicial usaremos una contraseña de texto plano o simple hash.
INSERT INTO `usuarios` (`id`, `negocio_id`, `username`, `password_hash`, `pin`, `rol`, `nombre_completo`, `telefono`)
VALUES (1, 'xgames-barcade', 'admin', 'XGAMESROOT', NULL, 'ADMIN', 'Administrador General', '521234567890')
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- 3. Insertar Cliente Demo
INSERT INTO `usuarios` (`id`, `negocio_id`, `username`, `password_hash`, `pin`, `rol`, `nombre_completo`, `telefono`)
VALUES (2, 'xgames-barcade', 'carlos', NULL, '1234', 'CLIENTE', 'Carlos Gomez', '521234567890')
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- 4. Perfil del Cliente Demo
INSERT INTO `clientes_perfil` (`usuario_id`, `nick`, `nivel`, `canciones_favoritas`, `color_neon`)
VALUES (2, 'CARLOS_PIU', 'S18 / D19', 'Beethoven Virus, Conflict, Canon D', 'Cyan')
ON DUPLICATE KEY UPDATE `nick` = VALUES(`nick`);

-- 5. Insertar Recursos (Máquinas Pump It Up)
INSERT INTO `recursos` (`id`, `negocio_id`, `nombre`, `tipo`, `activo`)
VALUES 
(1, 'xgames-barcade', 'Pump It Up LX 55\"', 'ARCADE', TRUE),
(2, 'xgames-barcade', 'Pump It Up TX 55\"', 'ARCADE', TRUE)
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- 6. Insertar una Reserva de prueba aprobada
INSERT INTO `reservas` (`negocio_id`, `recurso_id`, `cliente_id`, `fecha`, `hora_inicio`, `duracion_minutos`, `estado`, `pagado`, `es_mantenimiento`, `nota`)
VALUES ('xgames-barcade', 1, 2, CURDATE(), '16:00:00', 60, 'APROBADA', TRUE, FALSE, 'Reserva de prueba aprobada')
ON DUPLICATE KEY UPDATE `nota` = VALUES(`nota`);
