package br.com.churchhub.api.controller;

import br.com.churchhub.api.security.JwtService;
import br.com.churchhub.api.security.SecurityConfig;
import br.com.churchhub.api.security.SecurityErrorHandler;
import br.com.churchhub.api.security.UsuarioDetailsServiceImpl;
import br.com.churchhub.api.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Senha acima de 72 bytes vira 400 com mensagem no @Valid, antes de chegar ao BCrypt (que daria 500). */
@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, SecurityErrorHandler.class})
class AuthControllerTest {

    private static final String ACENTUADA_NO_LIMITE = "é".repeat(36);
    private static final String ACENTUADA_ACIMA = "é".repeat(37);

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;
    @MockitoBean
    private JwtService jwtService;
    @MockitoBean
    private UsuarioDetailsServiceImpl usuarioDetailsService;

    private ResultActions enviar(String caminho, String json) throws Exception {
        return mockMvc.perform(post(caminho)
                .contentType(MediaType.APPLICATION_JSON)
                .characterEncoding("UTF-8")
                .content(json));
    }

    @Test
    void resetComSenhaAcentuadaAcimaDe72BytesResponde400() throws Exception {
        enviar("/api/v1/auth/reset-password", """
                {"token": "abc", "newPassword": "%s"}""".formatted(ACENTUADA_ACIMA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A nova senha é longa demais: o limite é de 72 bytes "
                        + "(letras acentuadas e símbolos ocupam 2 ou mais)"));

        verifyNoInteractions(authService);
    }

    @Test
    void resetComSenhaAcentuadaNoLimiteChegaAoServico() throws Exception {
        enviar("/api/v1/auth/reset-password", """
                {"token": "abc", "newPassword": "%s"}""".formatted(ACENTUADA_NO_LIMITE))
                .andExpect(status().isNoContent());

        verify(authService).resetPassword(any());
    }

    @Test
    void loginComSenhaAcimaDe72BytesResponde400() throws Exception {
        enviar("/api/v1/auth/login", """
                {"email": "pastor@churchhub.local", "password": "%s"}""".formatted(ACENTUADA_ACIMA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A senha é longa demais: o limite é de 72 bytes "
                        + "(letras acentuadas e símbolos ocupam 2 ou mais)"));

        verifyNoInteractions(authService);
    }
}
