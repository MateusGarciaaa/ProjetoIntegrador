package br.com.churchhub.api.controller;

import br.com.churchhub.api.entity.NomePerfil;
import br.com.churchhub.api.entity.PasswordResetToken;
import br.com.churchhub.api.entity.Usuario;
import br.com.churchhub.api.repository.PasswordResetTokenRepository;
import br.com.churchhub.api.repository.PerfilRepository;
import br.com.churchhub.api.repository.UsuarioRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Gestão de usuários de ponta a ponta, com o banco real: convite (validade própria, reenvio que
 * invalida o anterior, aceite pelo mesmo reset-password) e desativação que derruba a sessão.
 * Cria os próprios usuários, com e-mails aleatórios, e os apaga no fim.
 */
@SpringBootTest
@AutoConfigureMockMvc
class GestaoUsuariosIntegrationTest {

    private static final String SENHA_ADMIN = "senhaAdmin1";

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
    @Autowired
    private Clock clock;

    private Usuario admin;
    private String tokenAdmin;
    private final List<String> emailsCriados = new ArrayList<>();

    @BeforeEach
    void criarAdministrador() throws Exception {
        admin = new Usuario();
        admin.setNome("Admin Integração");
        admin.setEmail(emailAleatorio("admin"));
        admin.setSenha(passwordEncoder.encode(SENHA_ADMIN));
        admin.setSenhaAlteradaEm(Instant.now().minus(Duration.ofDays(1)));
        admin.setPerfil(perfilRepository.findByNome(NomePerfil.ADMINISTRADOR.name()).orElseThrow());
        admin = usuarioRepository.save(admin);
        tokenAdmin = login(admin.getEmail(), SENHA_ADMIN);
    }

    @AfterEach
    void apagarUsuarios() {
        for (String email : emailsCriados) {
            usuarioRepository.findByEmail(email).ifPresent(usuario -> {
                resetTokenRepository.deleteAll(resetTokenRepository.findByUsuario(usuario));
                usuarioRepository.delete(usuario);
            });
        }
    }

    private String emailAleatorio(String prefixo) {
        String email = prefixo + "-" + UUID.randomUUID() + "@churchhub.local";
        emailsCriados.add(email);
        return email;
    }

    private String login(String email, String senha) throws Exception {
        String corpo = mockMvc.perform(json(post("/api/v1/auth/login"),
                        "{\"email\": \"%s\", \"password\": \"%s\"}".formatted(email, senha)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(corpo, "$.token");
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder requisicao, String corpo) {
        return requisicao.contentType(MediaType.APPLICATION_JSON).characterEncoding("UTF-8").content(corpo);
    }

    private ResultActions comoAdmin(MockHttpServletRequestBuilder requisicao) throws Exception {
        return mockMvc.perform(requisicao.header("Authorization", "Bearer " + tokenAdmin));
    }

    private List<PasswordResetToken> links(UUID usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId).orElseThrow();
        return resetTokenRepository.findByUsuario(usuario).stream()
                .sorted(Comparator.comparing(PasswordResetToken::getExpiraEm))
                .toList();
    }

    private UUID cadastrar(String email, NomePerfil perfil) throws Exception {
        String corpo = comoAdmin(json(post("/api/v1/users"),
                        "{\"nome\": \"Convidado\", \"email\": \"%s\", \"perfil\": \"%s\"}".formatted(email, perfil)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(email.toLowerCase()))
                .andExpect(jsonPath("$.ativo").value(true))
                .andExpect(jsonPath("$.convitePendente").value(true))
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(JsonPath.read(corpo, "$.id"));
    }

    @Test
    void conviteDe72HorasReenvioEAceitePeloResetPassword() throws Exception {
        String email = emailAleatorio("convite");
        UUID id = cadastrar(email.toUpperCase(), NomePerfil.MEMBRO);

        // Validade própria do convite, gravada no token (a redefinição continua com 30 min).
        PasswordResetToken primeiro = links(id).getFirst();
        assertThat(primeiro.getExpiraEm())
                .isCloseTo(LocalDateTime.now(clock).plusHours(72), within(Duration.ofMinutes(1)));

        // E-mail repetido, mesmo com outra caixa: 409.
        comoAdmin(json(post("/api/v1/users"),
                        "{\"nome\": \"Outro\", \"email\": \"%s\", \"perfil\": \"PASTOR\"}".formatted(email.toUpperCase())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Já existe um usuário com este e-mail"));

        // Reenviar invalida o link anterior.
        comoAdmin(post("/api/v1/users/" + id + "/invite")).andExpect(status().isNoContent());
        List<PasswordResetToken> depoisDoReenvio = links(id);
        assertThat(depoisDoReenvio).hasSize(2);
        assertThat(depoisDoReenvio).filteredOn(PasswordResetToken::isUsado)
                .extracting(PasswordResetToken::getToken).containsExactly(primeiro.getToken());
        String vigente = depoisDoReenvio.stream().filter(t -> !t.isUsado()).findFirst().orElseThrow().getToken();

        mockMvc.perform(json(post("/api/v1/auth/reset-password"),
                        "{\"token\": \"%s\", \"newPassword\": \"novaSenha1\"}".formatted(primeiro.getToken())))
                .andExpect(status().isBadRequest());
        mockMvc.perform(json(post("/api/v1/auth/reset-password"),
                        "{\"token\": \"%s\", \"newPassword\": \"novaSenha1\"}".formatted(vigente)))
                .andExpect(status().isNoContent());

        // Convite aceito: não está mais pendente, o login funciona e não há o que reenviar.
        comoAdmin(get("/api/v1/users/" + id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.convitePendente").value(false));
        String tokenConvidado = login(email, "novaSenha1");
        mockMvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + tokenConvidado))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value("MEMBRO"));
        comoAdmin(post("/api/v1/users/" + id + "/invite")).andExpect(status().isConflict());
    }

    @Test
    void desativadoPeloAdministradorPerdeASessaoNaRequisicaoSeguinte() throws Exception {
        String email = emailAleatorio("desativar");
        UUID id = cadastrar(email, NomePerfil.SECRETARIO);
        String link = links(id).getFirst().getToken();
        mockMvc.perform(json(post("/api/v1/auth/reset-password"),
                        "{\"token\": \"%s\", \"newPassword\": \"senhaSec1\"}".formatted(link)))
                .andExpect(status().isNoContent());
        String tokenSecretario = login(email, "senhaSec1");
        mockMvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + tokenSecretario))
                .andExpect(status().isOk());

        comoAdmin(post("/api/v1/users/" + id + "/deactivate")).andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(false));

        mockMvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + tokenSecretario))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(json(post("/api/v1/auth/login"),
                        "{\"email\": \"%s\", \"password\": \"senhaSec1\"}".formatted(email)))
                .andExpect(status().isUnauthorized());

        comoAdmin(post("/api/v1/users/" + id + "/activate")).andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(true));
        login(email, "senhaSec1");
    }

    @Test
    void mudarOPerfilPelaGestaoDerrubaASessaoDoUsuario() throws Exception {
        String email = emailAleatorio("perfil");
        UUID id = cadastrar(email, NomePerfil.TESOUREIRO);
        mockMvc.perform(json(post("/api/v1/auth/reset-password"),
                        "{\"token\": \"%s\", \"newPassword\": \"senhaTes1\"}".formatted(links(id).getFirst().getToken())))
                .andExpect(status().isNoContent());
        String tokenTesoureiro = login(email, "senhaTes1");

        comoAdmin(json(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/users/" + id),
                        "{\"nome\": \"Convidado\", \"perfil\": \"PASTOR\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + tokenTesoureiro))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Seu acesso foi alterado. Entre novamente."));
    }

    @Test
    void administradorNaoSeDesativaNemTiraOProprioPerfil() throws Exception {
        comoAdmin(post("/api/v1/users/" + admin.getId() + "/deactivate"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Você não pode desativar a sua própria conta"));
        comoAdmin(json(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/users/" + admin.getId()),
                        "{\"nome\": \"Admin\", \"perfil\": \"PASTOR\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Você não pode remover o seu próprio perfil de Administrador"));

        assertThat(usuarioRepository.findByEmail(admin.getEmail()).orElseThrow().isAtivo()).isTrue();
    }

    @Test
    void listaFiltraPorPerfilEAtivo() throws Exception {
        String email = emailAleatorio("filtro");
        UUID id = cadastrar(email, NomePerfil.TESOUREIRO);
        comoAdmin(post("/api/v1/users/" + id + "/deactivate")).andExpect(status().isOk());

        comoAdmin(get("/api/v1/users").param("perfil", "TESOUREIRO").param("ativo", "false").param("size", "2000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.email == '%s')]".formatted(email)).exists())
                .andExpect(jsonPath("$.content[?(@.perfil != 'TESOUREIRO' || @.ativo == true)]").isEmpty());
        comoAdmin(get("/api/v1/users").param("ativo", "true").param("size", "2000"))
                .andExpect(jsonPath("$.content[?(@.email == '%s')]".formatted(email)).isEmpty());
    }
}
