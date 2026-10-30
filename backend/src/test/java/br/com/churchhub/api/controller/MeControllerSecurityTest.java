package br.com.churchhub.api.controller;

import br.com.churchhub.api.dto.AlterarSenhaRequest;
import br.com.churchhub.api.dto.LoginResponse;
import br.com.churchhub.api.dto.MeResponse;
import br.com.churchhub.api.entity.NomePerfil;
import br.com.churchhub.api.entity.Perfil;
import br.com.churchhub.api.entity.Usuario;
import br.com.churchhub.api.exception.BusinessException;
import br.com.churchhub.api.security.JwtService;
import br.com.churchhub.api.security.SecurityConfig;
import br.com.churchhub.api.security.SecurityErrorHandler;
import br.com.churchhub.api.security.UsuarioDetailsImpl;
import br.com.churchhub.api.security.UsuarioDetailsServiceImpl;
import br.com.churchhub.api.service.ContaService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** "Minha conta": qualquer perfil autenticado; anônimo recebe 401. */
@WebMvcTest(MeController.class)
@Import({SecurityConfig.class, SecurityErrorHandler.class})
class MeControllerSecurityTest {

    private static final String ME = "/api/v1/me";
    private static final String SENHA = "/api/v1/me/password";
    private static final UUID ID = UUID.randomUUID();

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ContaService contaService;
    @MockitoBean
    private JwtService jwtService;
    @MockitoBean
    private UsuarioDetailsServiceImpl usuarioDetailsService;

    /** O controller lê o id do principal: precisa ser o UsuarioDetailsImpl da aplicação. */
    private static RequestPostProcessor logadoComo(NomePerfil nomePerfil) {
        Perfil perfil = new Perfil();
        perfil.setNome(nomePerfil.name());
        Usuario usuario = new Usuario();
        usuario.setId(ID);
        usuario.setEmail(nomePerfil.name().toLowerCase() + "@churchhub.local");
        usuario.setPerfil(perfil);
        return user(new UsuarioDetailsImpl(usuario));
    }

    @ParameterizedTest
    @EnumSource(NomePerfil.class)
    void todoPerfilVeOsPropriosDados(NomePerfil perfil) throws Exception {
        when(contaService.buscar(ID)).thenReturn(new MeResponse(ID, "Fulano", "fulano@churchhub.local", perfil));

        mockMvc.perform(get(ME).with(logadoComo(perfil)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Fulano"))
                .andExpect(jsonPath("$.perfil").value(perfil.name()))
                .andExpect(jsonPath("$.senha").doesNotExist());
    }

    @ParameterizedTest
    @EnumSource(NomePerfil.class)
    void todoPerfilTrocaAPropriaSenha(NomePerfil perfil) throws Exception {
        when(contaService.alterarSenha(eq(ID), any())).thenReturn(new LoginResponse("novo", "Bearer", 60));

        mockMvc.perform(put(SENHA).with(logadoComo(perfil)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\": \"senha123\", \"newPassword\": \"outra123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("novo"))
                .andExpect(jsonPath("$.type").value("Bearer"));
    }

    @Test
    void anonimoRecebe401() throws Exception {
        mockMvc.perform(get(ME)).andExpect(status().isUnauthorized());
        mockMvc.perform(put(SENHA).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\": \"senha123\", \"newPassword\": \"outra123\"}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(contaService);
    }

    @Test
    void novaSenhaCurtaEVaziaSao400() throws Exception {
        mockMvc.perform(put(SENHA).with(logadoComo(NomePerfil.MEMBRO)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\": \"\", \"newPassword\": \"12345\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.allOf(
                        org.hamcrest.Matchers.containsString("A senha atual é obrigatória"),
                        org.hamcrest.Matchers.containsString("A nova senha deve ter entre 6 e 72 caracteres"))));
        verifyNoInteractions(contaService);
    }

    @Test
    void novaSenhaAcimaDe72BytesEh400ENao500() throws Exception {
        mockMvc.perform(put(SENHA).with(logadoComo(NomePerfil.MEMBRO)).contentType(MediaType.APPLICATION_JSON)
                        .characterEncoding("UTF-8")
                        .content("{\"currentPassword\": \"senha123\", \"newPassword\": \"%s\"}".formatted("é".repeat(37))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("72 bytes")));
        verifyNoInteractions(contaService);
    }

    @Test
    void senhaAtualErradaEh400ParaNaoDerrubarASessaoNoFront() throws Exception {
        when(contaService.alterarSenha(eq(ID), any(AlterarSenhaRequest.class)))
                .thenThrow(new BusinessException("A senha atual está incorreta"));

        mockMvc.perform(put(SENHA).with(logadoComo(NomePerfil.PASTOR)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\": \"errada1\", \"newPassword\": \"outra123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A senha atual está incorreta"));
    }
}
