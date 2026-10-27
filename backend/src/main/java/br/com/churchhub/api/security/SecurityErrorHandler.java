package br.com.churchhub.api.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.io.IOException;

/**
 * Encaminha as falhas do Spring Security (401 e 403 ocorridos nos filtros) para o
 * {@code GlobalExceptionHandler}. Sem isso, o Spring responde 403 sem corpo até
 * para quem nem está autenticado. Assim existe um único lugar que formata erros.
 */
@Component
public class SecurityErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final HandlerExceptionResolver resolver;

    public SecurityErrorHandler(@Qualifier("handlerExceptionResolver") HandlerExceptionResolver resolver) {
        this.resolver = resolver;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException exception) throws IOException {
        delegar(request, response, exception, HttpServletResponse.SC_UNAUTHORIZED);
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException exception) throws IOException {
        delegar(request, response, exception, HttpServletResponse.SC_FORBIDDEN);
    }

    private void delegar(HttpServletRequest request, HttpServletResponse response,
                         Exception exception, int statusSeNaoTratado) throws IOException {
        if (resolver.resolveException(request, response, null, exception) == null) {
            response.sendError(statusSeNaoTratado);
        }
    }
}
