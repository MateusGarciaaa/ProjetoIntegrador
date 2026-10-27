package br.com.churchhub.api.controller;

import br.com.churchhub.api.entity.NomePerfil;
import br.com.churchhub.api.entity.PasswordResetToken;
import br.com.churchhub.api.entity.Usuario;
import br.com.churchhub.api.repository.PasswordResetTokenRepository;
import br.com.churchhub.api.repository.PerfilRepository;
import br.com.churchhub.api.repository.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Recuperação de senha de ponta a ponta, com o banco real (confere o UPDATE em JPQL de
 * invalidarPendentes). Cria um usuário próprio, com e-mail aleatório, e o apaga no fim.
 */
@SpringBootTest
@AutoConfigureMockMvc
class RecuperacaoSenhaIntegrationTest {

    private static final String RESPOSTA_NEUTRA =
            "{\"message\":\"Se o e-mail existir em nossa base, um link de redefinição foi enviado.\"}";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private PerfilRepository perfilRepository;
    @Autowired
    private PasswordResetTokenRepository resetTokenRepository;

    private Usuario usuario;

    @BeforeEach
    void criarUsuario() {
        usuario = new Usuario();
        usuario.setNome("Usuário integração");
        usuario.setEmail("integracao-" + UUID.randomUUID() + "@churchhub.local");
        usuario.setSenha("{noop}irrelevante");
        usuario.setPerfil(perfilRepository.findByNome(NomePerfil.MEMBRO.name()).orElseThrow());
        usuario = usuarioRepository.save(usuario);
    }

    @AfterEach
    void apagarUsuario() {
        resetTokenRepository.deleteAll(resetTokenRepository.findByUsuario(usuario));
        usuarioRepository.delete(usuario);
    }

    private ResultActions enviar(String caminho, String json) throws Exception {
        return mockMvc.perform(post(caminho).contentType(MediaType.APPLICATION_JSON).characterEncoding("UTF-8").content(json));
    }

    private ResultActions pedirLink(String email) throws Exception {
        return enviar("/api/v1/auth/forgot-password", "{\"email\": \"%s\"}".formatted(email));
    }

    private ResultActions redefinir(String token) throws Exception {
        return enviar("/api/v1/auth/reset-password", "{\"token\": \"%s\", \"newPassword\": \"novaSenha1\"}".formatted(token));
    }

    @Test
    void emailComMaiusculasRecebeLinkENovoPedidoInvalidaOAnterior() throws Exception {
        // Espaços nas pontas nem chegam aqui: o @Email recusa antes (400).
        String emailDigitado = usuario.getEmail().toUpperCase();
        pedirLink(emailDigitado).andExpect(status().isOk()).andExpect(content().json(RESPOSTA_NEUTRA));
        pedirLink(emailDigitado).andExpect(status().isOk()).andExpect(content().json(RESPOSTA_NEUTRA));

        List<PasswordResetToken> tokens = resetTokenRepository.findByUsuario(usuario).stream()
                .sorted(Comparator.comparing(PasswordResetToken::getExpiraEm))
                .toList();
        assertThat(tokens).extracting(PasswordResetToken::isUsado).containsExactly(true, false);

        redefinir(tokens.get(0).getToken()).andExpect(status().isBadRequest());
        redefinir(tokens.get(1).getToken()).andExpect(status().isNoContent());
    }

    @Test
    void usuarioInativoNaoRecebeLinkEARespostaEIgual() throws Exception {
        usuario.setAtivo(false);
        usuario = usuarioRepository.save(usuario);

        pedirLink(usuario.getEmail()).andExpect(status().isOk()).andExpect(content().json(RESPOSTA_NEUTRA, true));
        pedirLink("ninguem-" + UUID.randomUUID() + "@churchhub.local")
                .andExpect(status().isOk()).andExpect(content().json(RESPOSTA_NEUTRA, true));

        assertThat(resetTokenRepository.findByUsuario(usuario)).isEmpty();
    }
}
