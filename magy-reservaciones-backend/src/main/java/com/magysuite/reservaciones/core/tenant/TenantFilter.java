package com.magysuite.reservaciones.core.tenant;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class TenantFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(TenantFilter.class);
    private static final String TENANT_HEADER = "X-Tenant-ID";
    private static final String TENANT_QUERY_PARAM = "tenant";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Permitir peticiones OPTIONS (CORS Preflight) sin verificar inquilino
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        // Permitir accesos a rutas públicas como la creación de inquilinos, H2 console, api-docs, etc.
        String path = request.getRequestURI();
        if (path.startsWith("/api/negocios") && "POST".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        // Obtener el ID del inquilino desde la cabecera o de los parámetros de consulta
        String tenantId = request.getHeader(TENANT_HEADER);
        if (tenantId == null || tenantId.trim().isEmpty()) {
            tenantId = request.getParameter(TENANT_QUERY_PARAM);
        }

        if (tenantId == null || tenantId.trim().isEmpty()) {
            logger.warn("Petición rechazada: Falta el encabezado o parámetro del Inquilino (Tenant). Path: {}", path);
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\": \"Falta el encabezado obligatorio 'X-Tenant-ID' o el parámetro 'tenant'\"}");
            return;
        }

        try {
            TenantContext.setCurrentTenant(tenantId);
            logger.debug("Inquilino establecido: {}", tenantId);
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
