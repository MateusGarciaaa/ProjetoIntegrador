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
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * Autentica a requisição a partir do JWT do cabeçalho Authorization.
 *
 * <p>O usuário é relido do banco a cada requisição, então o token só vale enquanto o usuário
 * estiver ativo, não tiver trocado a senha depois da emissão e mantiver o perfil da claim
 * (ver {@link JwtService#avaliar}). Desativar, trocar a senha ou mudar o perfil derruba as
 * sessões abertas na requisição seguinte, sem esperar o {@code exp}.</p>
 *
 * <p>Token ausente, inválido ou expirado não interrompe a cadeia: a requisição segue
 * como anônima e o Spring Security decide. Rota pública passa normalmente; rota
 * protegida recebe 401 pelo {@link SecurityErrorHandler}, com o motivo guardado em
 * {@link SecurityErrorHandler#ATRIBUTO_SITUACAO_TOKEN} quando houver. Assim nenhuma exceção
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
    private final UsuarioDetailsServiceImpl userDetailsService;

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
            UsuarioDetailsImpl usuario = userDetailsService.loadUserByUsername(jwtService.extractUsername(token));
            SituacaoToken situacao = jwtService.avaliar(token, usuario);
            if (situacao == SituacaoToken.VALIDO) {
                var autenticacao = new UsernamePasswordAuthenticationToken(usuario, null, usuario.getAuthorities());
                autenticacao.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(autenticacao);
            } else {
                log.debug("Token JWT recusado: {}", situacao);
                request.setAttribute(SecurityErrorHandler.ATRIBUTO_SITUACAO_TOKEN, situacao);
            }
        } catch (JwtException | UsernameNotFoundException | IllegalArgumentException e) {
            log.debug("Token JWT recusado: {}", e.getMessage());
        }
    }
}
