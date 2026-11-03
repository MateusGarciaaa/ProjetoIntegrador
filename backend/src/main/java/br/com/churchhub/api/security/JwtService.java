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
import java.time.Clock;
import java.time.Instant;
import java.util.Date;

@Component
public class JwtService {

    /** HS256 exige chave de no mínimo 256 bits. */
    private static final int TAMANHO_MINIMO_SEGREDO_BYTES = 32;

    static final String CLAIM_PERFIL = "perfil";
    static final String CLAIM_NOME = "nome";

    private final SecretKey key;
    private final long expirationMs;
    /** O mesmo relógio que grava usuarios.senha_alterada_em: iat e troca de senha na mesma régua. */
    private final Clock clock;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs,
            Clock clock) {
        this.key = criarChave(secret);
        this.expirationMs = expirationMs;
        this.clock = clock;
    }

    public String generateToken(UsuarioDetailsImpl userDetails) {
        Instant now = Instant.now(clock);
        return Jwts.builder()
                .subject(userDetails.getUsername())
                .claim(CLAIM_PERFIL, extractRole(userDetails))
                .claim(CLAIM_NOME, userDetails.getNome())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMs)))
                .signWith(key)
                .compact();
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    /**
     * Confere o token contra o estado atual do usuário, relido do banco a cada requisição.
     * Assinatura e prazo ({@code exp}) são verificados pelo parser, no relógio da aplicação.
     *
     * <p>Precisão: o {@code iat} do JWT tem resolução de segundos (o jjwt descarta os
     * milissegundos) e {@code senhaAlteradaEm} é gravado já truncado em segundos. O token
     * emitido logo após a troca, no mesmo segundo, tem {@code iat == senhaAlteradaEm} e vale;
     * por isso a recusa é só para {@code iat < senhaAlteradaEm}. Consequência aceita: um token
     * emitido no mesmo segundo, antes da troca, também continua valendo.</p>
     */
    public SituacaoToken avaliar(String token, UsuarioDetailsImpl usuario) {
        Claims claims;
        try {
            claims = parseClaims(token);
        } catch (JwtException | IllegalArgumentException e) {
            return SituacaoToken.INVALIDO;
        }
        if (!usuario.getUsername().equals(claims.getSubject()) || !usuario.isEnabled()) {
            return SituacaoToken.INVALIDO;
        }
        Instant senhaAlteradaEm = usuario.getSenhaAlteradaEm();
        if (senhaAlteradaEm != null && (claims.getIssuedAt() == null
                || claims.getIssuedAt().toInstant().isBefore(senhaAlteradaEm))) {
            return SituacaoToken.SENHA_ALTERADA;
        }
        if (!extractRole(usuario).equals(claims.get(CLAIM_PERFIL, String.class))) {
            return SituacaoToken.PERFIL_ALTERADO;
        }
        return SituacaoToken.VALIDO;
    }

    public long getExpirationSeconds() {
        return expirationMs / 1000;
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .clock(() -> Date.from(Instant.now(clock)))
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

    private static String extractRole(UserDetails userDetails) {
        return userDetails.getAuthorities().iterator().next().getAuthority();
    }
}
