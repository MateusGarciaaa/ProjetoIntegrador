package br.com.churchhub.api.security;

import br.com.churchhub.api.entity.Perfil;
import br.com.churchhub.api.entity.Usuario;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SEGREDO = "segredo-de-teste-com-mais-de-32-caracteres";
    private static final long UMA_HORA_MS = 3_600_000;

    private final JwtService jwtService = new JwtService(SEGREDO, UMA_HORA_MS);

    @Test
    void recusaSubirComSegredoCurto() {
        assertThatThrownBy(() -> new JwtService("curto", UMA_HORA_MS))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }

    @Test
    void tokenGeradoValeApenasParaOProprioUsuario() {
        UsuarioDetailsImpl ana = usuario("ana@igreja.com");
        String token = jwtService.generateToken(ana);

        assertThat(jwtService.extractUsername(token)).isEqualTo("ana@igreja.com");
        assertThat(jwtService.isTokenValid(token, ana)).isTrue();
        assertThat(jwtService.isTokenValid(token, usuario("outro@igreja.com"))).isFalse();
    }

    @Test
    void tokenAssinadoComOutroSegredoEhRecusado() {
        JwtService outraChave = new JwtService("outro-segredo-tambem-com-mais-de-32-caracteres", UMA_HORA_MS);
        String tokenForjado = outraChave.generateToken(usuario("ana@igreja.com"));

        assertThat(jwtService.isTokenValid(tokenForjado, usuario("ana@igreja.com"))).isFalse();
        assertThatThrownBy(() -> jwtService.extractUsername(tokenForjado)).isInstanceOf(JwtException.class);
    }

    @Test
    void tokenExpiradoEhRecusado() {
        JwtService jaVencido = new JwtService(SEGREDO, -1_000);
        String token = jaVencido.generateToken(usuario("ana@igreja.com"));

        assertThat(jwtService.isTokenValid(token, usuario("ana@igreja.com"))).isFalse();
    }

    private static UsuarioDetailsImpl usuario(String email) {
        Perfil perfil = new Perfil();
        perfil.setNome("ADMINISTRADOR");
        Usuario usuario = new Usuario();
        usuario.setEmail(email);
        usuario.setPerfil(perfil);
        return new UsuarioDetailsImpl(usuario);
    }
}
