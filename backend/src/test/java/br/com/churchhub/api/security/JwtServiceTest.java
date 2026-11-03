package br.com.churchhub.api.security;

import br.com.churchhub.api.entity.Perfil;
import br.com.churchhub.api.entity.Usuario;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SEGREDO = "segredo-de-teste-com-mais-de-32-caracteres";
    private static final long UMA_HORA_MS = 3_600_000;
    /** 10:00:00.900 UTC: o iat do token emitido agora é 10:00:00 (o jjwt descarta os milissegundos). */
    private static final Instant AGORA = Instant.parse("2026-10-28T10:00:00.900Z");

    private final JwtService jwtService = emitidoEm(AGORA);

    private static JwtService emitidoEm(Instant instante) {
        return new JwtService(SEGREDO, UMA_HORA_MS, Clock.fixed(instante, ZoneOffset.UTC));
    }

    @Test
    void recusaSubirComSegredoCurto() {
        assertThatThrownBy(() -> new JwtService("curto", UMA_HORA_MS, Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }

    @Test
    void tokenGeradoValeApenasParaOProprioUsuario() {
        UsuarioDetailsImpl ana = usuario("ana@igreja.com", "ADMINISTRADOR");
        String token = jwtService.generateToken(ana);

        assertThat(jwtService.extractUsername(token)).isEqualTo("ana@igreja.com");
        assertThat(jwtService.avaliar(token, ana)).isEqualTo(SituacaoToken.VALIDO);
        assertThat(jwtService.avaliar(token, usuario("outro@igreja.com", "ADMINISTRADOR")))
                .isEqualTo(SituacaoToken.INVALIDO);
    }

    @Test
    void tokenLevaONomeEOPerfil() {
        String token = jwtService.generateToken(usuario("ana@igreja.com", "PASTOR"));

        var claims = Jwts.parser().verifyWith(Keys.hmacShaKeyFor(SEGREDO.getBytes(StandardCharsets.UTF_8)))
                .clock(() -> Date.from(AGORA)).build().parseSignedClaims(token).getPayload();
        assertThat(claims.get("nome", String.class)).isEqualTo("Ana Souza");
        assertThat(claims.get("perfil", String.class)).isEqualTo("ROLE_PASTOR");
        assertThat(claims.getIssuedAt().toInstant()).isEqualTo(Instant.parse("2026-10-28T10:00:00Z"));
    }

    @Test
    void tokenAssinadoComOutroSegredoEhRecusado() {
        JwtService outraChave = new JwtService("outro-segredo-tambem-com-mais-de-32-caracteres", UMA_HORA_MS,
                Clock.fixed(AGORA, ZoneOffset.UTC));
        String tokenForjado = outraChave.generateToken(usuario("ana@igreja.com", "ADMINISTRADOR"));

        assertThat(jwtService.avaliar(tokenForjado, usuario("ana@igreja.com", "ADMINISTRADOR")))
                .isEqualTo(SituacaoToken.INVALIDO);
        assertThatThrownBy(() -> jwtService.extractUsername(tokenForjado)).isInstanceOf(JwtException.class);
    }

    @Test
    void tokenExpiradoEhRecusado() {
        JwtService jaVencido = new JwtService(SEGREDO, -1_000, Clock.fixed(AGORA, ZoneOffset.UTC));
        String token = jaVencido.generateToken(usuario("ana@igreja.com", "ADMINISTRADOR"));

        assertThat(jwtService.avaliar(token, usuario("ana@igreja.com", "ADMINISTRADOR")))
                .isEqualTo(SituacaoToken.INVALIDO);
    }

    @Test
    void usuarioDesativadoTemOTokenRecusado() {
        UsuarioDetailsImpl ana = usuario("ana@igreja.com", "ADMINISTRADOR");
        String token = jwtService.generateToken(ana);
        ana = usuario("ana@igreja.com", "ADMINISTRADOR", false, null);

        assertThat(jwtService.avaliar(token, ana)).isEqualTo(SituacaoToken.INVALIDO);
    }

    @Test
    void perfilDiferenteDaClaimDerrubaASessao() {
        String token = jwtService.generateToken(usuario("ana@igreja.com", "SECRETARIO"));

        assertThat(jwtService.avaliar(token, usuario("ana@igreja.com", "TESOUREIRO")))
                .isEqualTo(SituacaoToken.PERFIL_ALTERADO);
    }

    // ---------- iat × senhaAlteradaEm (precisão de segundos) ----------

    @Test
    void tokenEmitidoNoMesmoSegundoDaTrocaDeSenhaVale() {
        // Troca às 10:00:00.200, gravada como 10:00:00; token novo às 10:00:00.900, iat 10:00:00.
        // Sem truncar a troca, o iat (10:00:00) seria "antes" de 10:00:00.200 e o token novo cairia.
        Instant troca = Instant.parse("2026-10-28T10:00:00Z");
        String token = jwtService.generateToken(usuario("ana@igreja.com", "PASTOR"));

        assertThat(jwtService.avaliar(token, usuario("ana@igreja.com", "PASTOR", true, troca)))
                .isEqualTo(SituacaoToken.VALIDO);
    }

    @Test
    void tokenEmitidoUmSegundoAntesDaTrocaDeSenhaCai() {
        String token = emitidoEm(Instant.parse("2026-10-28T09:59:59.999Z"))
                .generateToken(usuario("ana@igreja.com", "PASTOR"));
        Instant troca = Instant.parse("2026-10-28T10:00:00Z");

        assertThat(jwtService.avaliar(token, usuario("ana@igreja.com", "PASTOR", true, troca)))
                .isEqualTo(SituacaoToken.SENHA_ALTERADA);
    }

    @Test
    void tokenEmitidoDepoisDaTrocaDeSenhaVale() {
        Instant troca = Instant.parse("2026-10-28T09:00:00Z");
        String token = jwtService.generateToken(usuario("ana@igreja.com", "PASTOR"));

        assertThat(jwtService.avaliar(token, usuario("ana@igreja.com", "PASTOR", true, troca)))
                .isEqualTo(SituacaoToken.VALIDO);
    }

    @Test
    void definirSenhaTruncaOInstanteEmSegundos() {
        Usuario usuario = new Usuario();
        usuario.definirSenha("hash", Clock.fixed(AGORA, ZoneOffset.UTC));

        assertThat(usuario.getSenhaAlteradaEm()).isEqualTo(Instant.parse("2026-10-28T10:00:00Z"));
        assertThat(usuario.isConvitePendente()).isFalse();
    }

    private static UsuarioDetailsImpl usuario(String email, String perfil) {
        return usuario(email, perfil, true, null);
    }

    private static UsuarioDetailsImpl usuario(String email, String nomePerfil, boolean ativo, Instant senhaAlteradaEm) {
        Perfil perfil = new Perfil();
        perfil.setNome(nomePerfil);
        Usuario usuario = new Usuario();
        usuario.setNome("Ana Souza");
        usuario.setEmail(email);
        usuario.setPerfil(perfil);
        usuario.setAtivo(ativo);
        usuario.setSenhaAlteradaEm(senhaAlteradaEm);
        return new UsuarioDetailsImpl(usuario);
    }
}
