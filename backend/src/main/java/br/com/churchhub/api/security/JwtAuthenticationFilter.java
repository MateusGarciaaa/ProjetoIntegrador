package br.com.churchhub.api.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * Autentica a requisição a partir do JWT do cabeçalho Authorization.
 *
 * <p>Token ausente, inválido ou expirado não interrompe a cadeia: a requisição segue
 * como anônima e o Spring Security decide. Rota pública passa normalmente; rota
 * protegida recebe 401 pelo {@link SecurityErrorHandler}. Assim nenhuma exceção
 * escapa do filtro, onde o {@code @ControllerAdvice} não alcança.</p>
 *
 * <p>Não é {@code @Component} de propósito: o Spring Boot registraria qualquer
 * {@code Filter} anotado também como filtro de servlet, fora da cadeia de segurança.
 * Quem o instancia é o {@link SecurityConfig}.</p>
 */
@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String PREFIXO_BEARER = "Bearer ";

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            extrairToken(request).ifPresent(token -> autenticar(token, request));
        }
        filterChain.doFilter(request, response);
    }

    private Optional<String> extrairToken(HttpServletRequest request) {
        String cabecalho = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (cabecalho == null || !cabecalho.startsWith(PREFIXO_BEARER)) {
            return Optional.empty();
        }
        return Optional.of(cabecalho.substring(PREFIXO_BEARER.length()));
    }

    private void autenticar(String token, HttpServletRequest request) {
        try {
            UserDetails usuario = userDetailsService.loadUserByUsername(jwtService.extractUsername(token));
            if (jwtService.isTokenValid(token, usuario) && usuario.isEnabled()) {
                var autenticacao = new UsernamePasswordAuthenticationToken(usuario, null, usuario.getAuthorities());
                autenticacao.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(autenticacao);
            }
        } catch (JwtException | UsernameNotFoundException | IllegalArgumentException e) {
            log.debug("Token JWT recusado: {}", e.getMessage());
        }
    }
}
