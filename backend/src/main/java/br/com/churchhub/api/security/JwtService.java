package br.com.churchhub.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Component
public class JwtService {

    /** HS256 exige chave de no mínimo 256 bits. */
    private static final int TAMANHO_MINIMO_SEGREDO_BYTES = 32;

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = criarChave(secret);
        this.expirationMs = expirationMs;
    }

    public String generateToken(UsuarioDetailsImpl userDetails) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userDetails.getUsername())
                .claim("perfil", extractRole(userDetails))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMs)))
                .signWith(key)
                .compact();
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            String username = extractUsername(token);
            return username.equals(userDetails.getUsername()) && !isExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public long getExpirationSeconds() {
        return expirationMs / 1000;
    }

    private boolean isExpired(String token) {
        return parseClaims(token).getExpiration().before(new Date());
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Falha na inicialização, com mensagem clara, em vez de subir com chave fraca ou
     * previsível: quem conhece o segredo consegue forjar token de qualquer perfil.
     */
    private static SecretKey criarChave(String secret) {
        byte[] bytes = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < TAMANHO_MINIMO_SEGREDO_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET ausente ou curto demais: defina pelo menos 32 caracteres aleatórios "
                            + "(ex.: openssl rand -base64 48).");
        }
        return Keys.hmacShaKeyFor(bytes);
    }

    private String extractRole(UsuarioDetailsImpl userDetails) {
        return userDetails.getAuthorities().iterator().next().getAuthority();
    }
}