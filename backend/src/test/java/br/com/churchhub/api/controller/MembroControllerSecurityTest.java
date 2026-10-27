package br.com.churchhub.api.controller;

import br.com.churchhub.api.dto.MembroResumoResponse;
import br.com.churchhub.api.entity.StatusMembro;
import br.com.churchhub.api.security.JwtService;
import br.com.churchhub.api.security.SecurityConfig;
import br.com.churchhub.api.security.SecurityErrorHandler;
import br.com.churchhub.api.security.UsuarioDetailsServiceImpl;
import br.com.churchhub.api.service.MembroService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Autorização de leitura de membros: a ficha completa (GET /members e /members/{id}) é de
 * A, P e S; o TESOUREIRO só usa a busca enxuta (GET /members/lookup).
 */
@WebMvcTest(MembroController.class)
@Import({SecurityConfig.class, SecurityErrorHandler.class})
class MembroControllerSecurityTest {

    private static final String LISTA = "/api/v1/members";
    private static final String FICHA = "/api/v1/members/" + UUID.randomUUID();
    private static final String LOOKUP = "/api/v1/members/lookup";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MembroService membroService;
    @MockitoBean
    private JwtService jwtService;
    @MockitoBean
    private UsuarioDetailsServiceImpl usuarioDetailsService;

    private static RequestPostProcessor logadoComo(String perfil) {
        return user(perfil.toLowerCase() + "@churchhub.local").roles(perfil);
    }

    @Test
    void tesoureiroNaoLeAFichaCompleta() throws Exception {
        mockMvc.perform(get(LISTA).with(logadoComo("TESOUREIRO"))).andExpect(status().isForbidden());
        mockMvc.perform(get(FICHA).with(logadoComo("TESOUREIRO"))).andExpect(status().isForbidden());
        verifyNoInteractions(membroService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMINISTRADOR", "PASTOR", "SECRETARIO"})
    void gestoresDoRolLeemAFichaCompleta(String perfil) throws Exception {
        when(membroService.listar(any(), any())).thenReturn(Page.empty());

        mockMvc.perform(get(LISTA).with(logadoComo(perfil))).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMINISTRADOR", "PASTOR", "SECRETARIO", "TESOUREIRO"})
    void lookupDevolveSoIdNomeEStatus(String perfil) throws Exception {
        MembroResumoResponse ana = new MembroResumoResponse(UUID.randomUUID(), "Ana", StatusMembro.ATIVO);
        when(membroService.buscarResumo(any(), any(), any())).thenReturn(new PageImpl<>(List.of(ana)));

        mockMvc.perform(get(LOOKUP).param("nome", "an").with(logadoComo(perfil)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].nome").value("Ana"))
                .andExpect(jsonPath("$.content[0].status").value("ATIVO"))
                .andExpect(jsonPath("$.content[0].cpf").doesNotExist())
                .andExpect(jsonPath("$.content[0].email").doesNotExist());
    }

    @Test
    void membroRecebe403NoLookup() throws Exception {
        mockMvc.perform(get(LOOKUP).with(logadoComo("MEMBRO"))).andExpect(status().isForbidden());
        verifyNoInteractions(membroService);
    }

    @Test
    void lookupSemTokenRecebe401() throws Exception {
        mockMvc.perform(get(LOOKUP)).andExpect(status().isUnauthorized());
    }

    @Test
    void lookupComStatusInvalidoRecebe400() throws Exception {
        mockMvc.perform(get(LOOKUP).param("status", "INEXISTENTE").with(logadoComo("TESOUREIRO")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Valor inválido para o parâmetro 'status'."))
                .andExpect(jsonPath("$.path").value(LOOKUP));
        verifyNoInteractions(membroService);
    }

    @Test
    void lookupSemFiltrosRepassaNulos() throws Exception {
        when(membroService.buscarResumo(isNull(), isNull(), any())).thenReturn(Page.empty());

        mockMvc.perform(get(LOOKUP).with(logadoComo("TESOUREIRO"))).andExpect(status().isOk());
    }
}
