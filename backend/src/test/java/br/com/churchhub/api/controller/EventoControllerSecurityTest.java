package br.com.churchhub.api.controller;

import br.com.churchhub.api.dto.EventoResponse;
import br.com.churchhub.api.exception.ConflictException;
import br.com.churchhub.api.security.JwtService;
import br.com.churchhub.api.security.SecurityConfig;
import br.com.churchhub.api.security.SecurityErrorHandler;
import br.com.churchhub.api.security.UsuarioDetailsServiceImpl;
import br.com.churchhub.api.service.EventoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Agenda aberta a qualquer perfil autenticado; cadastro e edição só A e S; exclusão só A.
 * RN09 (evento encerrado) responde 409.
 */
@WebMvcTest(EventoController.class)
@Import({SecurityConfig.class, SecurityErrorHandler.class})
class EventoControllerSecurityTest {

    private static final String LISTA = "/api/v1/events";
    private static final UUID ID = UUID.randomUUID();
    private static final String EVENTO = LISTA + "/" + ID;
    private static final String CORPO = """
            {"titulo":"Culto","descricao":null,"data":"2026-11-05","horario":"19:30","local":null}""";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EventoService eventoService;
    @MockitoBean
    private JwtService jwtService;
    @MockitoBean
    private UsuarioDetailsServiceImpl usuarioDetailsService;

    private static RequestPostProcessor logadoComo(String perfil) {
        return user(perfil.toLowerCase() + "@churchhub.local").roles(perfil);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMINISTRADOR", "PASTOR", "SECRETARIO", "TESOUREIRO", "MEMBRO"})
    void qualquerPerfilAutenticadoConsultaAAgenda(String perfil) throws Exception {
        when(eventoService.listar(any(), any(), any())).thenReturn(Page.empty());
        when(eventoService.buscarPorId(ID)).thenReturn(
                new EventoResponse(ID, "Culto", null, LocalDate.of(2026, 11, 5), LocalTime.of(19, 30), null));

        mockMvc.perform(get(LISTA).with(logadoComo(perfil))).andExpect(status().isOk());
        mockMvc.perform(get(EVENTO).with(logadoComo(perfil))).andExpect(status().isOk());
    }

    @Test
    void semLoginNaoConsulta() throws Exception {
        mockMvc.perform(get(LISTA)).andExpect(status().isUnauthorized());
        verifyNoInteractions(eventoService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"PASTOR", "TESOUREIRO", "MEMBRO"})
    void soAdministradorESecretarioCadastramEEditam(String perfil) throws Exception {
        mockMvc.perform(post(LISTA).with(logadoComo(perfil)).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isForbidden());
        mockMvc.perform(put(EVENTO).with(logadoComo(perfil)).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isForbidden());
        verifyNoInteractions(eventoService);
    }

    @Test
    void secretarioNaoExclui() throws Exception {
        mockMvc.perform(delete(EVENTO).with(logadoComo("SECRETARIO"))).andExpect(status().isForbidden());
        mockMvc.perform(delete(EVENTO).with(logadoComo("ADMINISTRADOR"))).andExpect(status().isNoContent());
    }

    @Test
    void ordenacaoPadraoPorDataHorarioEId() throws Exception {
        when(eventoService.listar(any(), any(), any())).thenReturn(Page.empty());

        mockMvc.perform(get(LISTA).with(logadoComo("MEMBRO"))).andExpect(status().isOk());

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(eventoService).listar(isNull(), isNull(), pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(20);
        assertThat(pageable.getValue().getSort()).isEqualTo(Sort.by("data", "horario", "id"));
    }

    @Test
    void eventoEncerradoRespondeConflito() throws Exception {   // RN09
        String mensagem = "Este evento já foi encerrado e só pode ser editado por um administrador";
        when(eventoService.atualizar(eq(ID), any(), anyBoolean())).thenThrow(new ConflictException(mensagem));

        mockMvc.perform(put(EVENTO).with(logadoComo("SECRETARIO")).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(mensagem));
        verify(eventoService).atualizar(eq(ID), any(), eq(false));
    }
}
