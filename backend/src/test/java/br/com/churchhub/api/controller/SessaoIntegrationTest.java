package br.com.churchhub.api.controller;

import br.com.churchhub.api.entity.NomePerfil;
import br.com.churchhub.api.entity.PasswordResetToken;
import br.com.churchhub.api.entity.Usuario;
import br.com.churchhub.api.repository.PasswordResetTokenRepository;
import br.com.churchhub.api.repository.PerfilRepository;
import br.com.churchhub.api.repository.UsuarioRepository;
import br.com.churchhub.api.security.JwtService;
import br.com.churchhub.api.security.UsuarioDetailsImpl;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Sessão de ponta a ponta, com o banco real: o token deixa de valer na requisição seguinte
 * quando o usuário é desativado, muda de perfil ou troca a senha (logado ou pelo link).
 */
@SpringBootTest
@AutoConfigureMockMvc
class SessaoIntegrationTest {

    private static final String SENHA = "senhaInicial1";
    private static final String MENSAGEM_GENERICA = "Sessão inválida ou expirada. Faça login novamente.";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private PerfilRepository perfilRepository;
    @Autowired
    private PasswordResetTokenRepository resetTokenRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${app.jwt.secret}")
    private String segredo;
    @Value("${app.jwt.expiration-ms}")
    private long expiracaoMs;

    private Usuario usuario;

    @BeforeEach
    void criarUsuario() {
        usuario = new Usuario();
        usuario.setNome("Sessão Integração");
        usuario.setEmail("sessao-" + UUID.randomUUID() + "@churchhub.local");
        usuario.setSenha(passwordEncoder.encode(SENHA));
        usuario.setSenhaAlteradaEm(Instant.now().minus(Duration.ofDays(1)));
        usuario.setPerfil(perfilRepository.findByNome(NomePerfil.SECRETARIO.name()).orElseThrow());
        usuario = usuarioRepository.save(usuario);
    }

    @AfterEach
    void apagarUsuario() {
        resetTokenRepository.deleteAll(resetTokenRepository.findByUsuario(usuario));
        usuarioRepository.deleteById(usuario.getId());
    }

    private String login(String senha) throws Exception {
        String corpo = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": \"%s\", \"password\": \"%s\"}".formatted(usuario.getEmail(), senha)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(corpo, "$.token");
    }

    /** Token autêntico emitido 5 s atrás, para separar com folga o iat do instante da troca de senha. */
    private String tokenEmitidoHaCincoSegundos() {
        JwtService noPassado = new JwtService(segredo, expiracaoMs,
                Clock.offset(Clock.systemUTC(), Duration.ofSeconds(-5)));
        return noPassado.generateToken(new UsuarioDetailsImpl(recarregar()));
    }

    private Usuario recarregar() {
        return usuarioRepository.findByEmail(usuario.getEmail()).orElseThrow();
    }

    private ResultActions me(String token) throws Exception {
        return mockMvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + token));
    }

    @Test
    void tokenDoLoginAbreMinhaContaComNome() throws Exception {
        me(login(SENHA)).andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Sessão Integração"))
                .andExpect(jsonPath("$.email").value(usuario.getEmail()))
                .andExpect(jsonPath("$.perfil").value("SECRETARIO"));
    }

    @Test
    void desativadoRecebe401NaRequisicaoSeguinte() throws Exception {
        String token = login(SENHA);
        me(token).andExpect(status().isOk());

        Usuario atual = recarregar();
        atual.setAtivo(false);
        usuarioRepository.save(atual);

        me(token).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value(MENSAGEM_GENERICA));
    }

    @Test
    void perfilAlteradoDerrubaASessaoComMotivo() throws Exception {
        String token = login(SENHA);

        Usuario atual = recarregar();
        atual.setPerfil(perfilRepository.findByNome(NomePerfil.TESOUREIRO.name()).orElseThrow());
        usuarioRepository.save(atual);

        me(token).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Seu acesso foi alterado. Entre novamente."));
        me(login(SENHA)).andExpect(status().isOk()).andExpect(jsonPath("$.perfil").value("TESOUREIRO"));
    }

    @Test
    void trocaDeSenhaLogadoDerrubaOsTokensAntigosEOTokenDevolvidoContinua() throws Exception {
        String antigo = tokenEmitidoHaCincoSegundos();
        me(antigo).andExpect(status().isOk());

        String corpo = mockMvc.perform(put("/api/v1/me/password").header("Authorization", "Bearer " + antigo)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\": \"%s\", \"newPassword\": \"senhaNova22\"}".formatted(SENHA)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String novo = JsonPath.read(corpo, "$.token");

        // O token devolvido sai no mesmo segundo da troca (iat == senha_alterada_em) e precisa valer.
        me(novo).andExpect(status().isOk());
        me(antigo).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Sua senha foi alterada. Entre novamente."));

        assertThat(recarregar().getSenhaAlteradaEm().getNano()).isZero();
        login("senhaNova22");
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": \"%s\", \"password\": \"%s\"}".formatted(usuario.getEmail(), SENHA)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void redefinicaoPeloLinkTambemEncerraAsSessoes() throws Exception {
        String antigo = tokenEmitidoHaCincoSegundos();
        me(antigo).andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": \"%s\"}".formatted(usuario.getEmail())))
                .andExpect(status().isOk());
        PasswordResetToken link = resetTokenRepository.findByUsuario(usuario).getFirst();
        mockMvc.perform(post("/api/v1/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\": \"%s\", \"newPassword\": \"senhaNova33\"}".formatted(link.getToken())))
                .andExpect(status().isNoContent());

        me(antigo).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Sua senha foi alterada. Entre novamente."));
        me(login("senhaNova33")).andExpect(status().isOk());
    }
}
