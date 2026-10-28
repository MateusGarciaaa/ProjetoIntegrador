package br.com.churchhub.api.controller;

import br.com.churchhub.api.dto.CategoriaFinanceiraResponse;
import br.com.churchhub.api.dto.MovimentacaoFinanceiraResponse;
import br.com.churchhub.api.dto.ResumoFinanceiroResponse;
import br.com.churchhub.api.entity.TipoMovimentacao;
import br.com.churchhub.api.security.JwtService;
import br.com.churchhub.api.security.SecurityConfig;
import br.com.churchhub.api.security.SecurityErrorHandler;
import br.com.churchhub.api.security.UsuarioDetailsServiceImpl;
import br.com.churchhub.api.service.MovimentacaoFinanceiraService;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
 * Financeiro: A, T e P consultam (lista, detalhe e resumo); A e T cadastram e editam;
 * só A exclui; S e M não entram. A lista repassa período, tipo e categoria ao serviço.
 */
@WebMvcTest(MovimentacaoFinanceiraController.class)
@Import({SecurityConfig.class, SecurityErrorHandler.class})
class MovimentacaoFinanceiraControllerSecurityTest {

    private static final String LISTA = "/api/v1/financial";
    private static final UUID ID = UUID.randomUUID();
    private static final UUID CATEGORIA = UUID.randomUUID();
    private static final String MOVIMENTACAO = LISTA + "/" + ID;
    private static final String RESUMO = LISTA + "/summary";
    private static final String CORPO = """
            {"descricao":"Dízimo","valor":450.00,"data":"2026-10-05","tipo":"RECEITA",
             "categoriaId":"%s","membroId":null}""".formatted(CATEGORIA);

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MovimentacaoFinanceiraService movimentacaoService;
    @MockitoBean
    private JwtService jwtService;
    @MockitoBean
    private UsuarioDetailsServiceImpl usuarioDetailsService;

    private static RequestPostProcessor logadoComo(String perfil) {
        return user(perfil.toLowerCase() + "@churchhub.local").roles(perfil);
    }

    private static MovimentacaoFinanceiraResponse dizimo() {
        return new MovimentacaoFinanceiraResponse(ID, "Dízimo", new BigDecimal("450.00"), LocalDate.of(2026, 10, 5),
                TipoMovimentacao.RECEITA, new CategoriaFinanceiraResponse(CATEGORIA, "Dízimos", TipoMovimentacao.RECEITA),
                null, null);
    }

    // ---------- consulta ----------

    @ParameterizedTest
    @ValueSource(strings = {"ADMINISTRADOR", "TESOUREIRO", "PASTOR"})
    void administradorTesoureiroEPastorConsultam(String perfil) throws Exception {
        when(movimentacaoService.listar(any(), any(), any(), any(), any())).thenReturn(Page.empty());
        when(movimentacaoService.buscarPorId(ID)).thenReturn(dizimo());
        when(movimentacaoService.resumo(any(), any())).thenReturn(new ResumoFinanceiroResponse(
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), BigDecimal.TEN, BigDecimal.ONE, BigDecimal.valueOf(9)));

        mockMvc.perform(get(LISTA).with(logadoComo(perfil))).andExpect(status().isOk());
        mockMvc.perform(get(MOVIMENTACAO).with(logadoComo(perfil))).andExpect(status().isOk());
        mockMvc.perform(get(RESUMO).param("dataInicio", "2026-10-01").param("dataFim", "2026-10-31")
                        .with(logadoComo(perfil)))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"SECRETARIO", "MEMBRO"})
    void secretarioEMembroNaoEntramNoFinanceiro(String perfil) throws Exception {
        mockMvc.perform(get(LISTA).with(logadoComo(perfil))).andExpect(status().isForbidden());
        mockMvc.perform(get(MOVIMENTACAO).with(logadoComo(perfil))).andExpect(status().isForbidden());
        mockMvc.perform(get(RESUMO).param("dataInicio", "2026-10-01").param("dataFim", "2026-10-31")
                        .with(logadoComo(perfil)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post(LISTA).with(logadoComo(perfil)).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isForbidden());
        mockMvc.perform(put(MOVIMENTACAO).with(logadoComo(perfil)).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete(MOVIMENTACAO).with(logadoComo(perfil))).andExpect(status().isForbidden());
        verifyNoInteractions(movimentacaoService);
    }

    @Test
    void semLoginRecebe401() throws Exception {
        mockMvc.perform(get(LISTA)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(MOVIMENTACAO)).andExpect(status().isUnauthorized());
        mockMvc.perform(post(LISTA).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete(MOVIMENTACAO)).andExpect(status().isUnauthorized());
        verifyNoInteractions(movimentacaoService);
    }

    // ---------- escrita ----------

    @ParameterizedTest
    @ValueSource(strings = {"ADMINISTRADOR", "TESOUREIRO"})
    void administradorETesoureiroCadastramEEditam(String perfil) throws Exception {
        when(movimentacaoService.cadastrar(any())).thenReturn(dizimo());
        when(movimentacaoService.atualizar(eq(ID), any())).thenReturn(dizimo());

        mockMvc.perform(post(LISTA).with(logadoComo(perfil)).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.valor").value(450.00));
        mockMvc.perform(put(MOVIMENTACAO).with(logadoComo(perfil)).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isOk());
    }

    @Test
    void pastorSoConsulta() throws Exception {
        mockMvc.perform(post(LISTA).with(logadoComo("PASTOR")).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isForbidden());
        mockMvc.perform(put(MOVIMENTACAO).with(logadoComo("PASTOR")).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete(MOVIMENTACAO).with(logadoComo("PASTOR"))).andExpect(status().isForbidden());
        verifyNoInteractions(movimentacaoService);
    }

    @Test
    void soAdministradorExclui() throws Exception {
        mockMvc.perform(delete(MOVIMENTACAO).with(logadoComo("TESOUREIRO"))).andExpect(status().isForbidden());
        verifyNoInteractions(movimentacaoService);

        mockMvc.perform(delete(MOVIMENTACAO).with(logadoComo("ADMINISTRADOR"))).andExpect(status().isNoContent());
        verify(movimentacaoService).excluir(ID);
    }

    // ---------- filtros da lista ----------

    @Test
    void listaRepassaPeriodoTipoCategoriaEOrdenacao() throws Exception {
        when(movimentacaoService.listar(any(), any(), any(), any(), any())).thenReturn(Page.empty());

        mockMvc.perform(get(LISTA)
                        .param("dataInicio", "2026-10-01")
                        .param("dataFim", "2026-10-31")
                        .param("tipo", "DESPESA")
                        .param("categoriaId", CATEGORIA.toString())
                        .param("page", "1")
                        .param("size", "10")
                        .param("sort", "data,desc")
                        .param("sort", "id,desc")
                        .with(logadoComo("TESOUREIRO")))
                .andExpect(status().isOk());

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(movimentacaoService).listar(eq(LocalDate.of(2026, 10, 1)), eq(LocalDate.of(2026, 10, 31)),
                eq(TipoMovimentacao.DESPESA), eq(CATEGORIA), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isEqualTo(1);
        assertThat(pageable.getValue().getPageSize()).isEqualTo(10);
        assertThat(pageable.getValue().getSort()).isEqualTo(Sort.by(Sort.Order.desc("data"), Sort.Order.desc("id")));
    }

    @Test
    void listaSemFiltrosRepassaNulos() throws Exception {
        when(movimentacaoService.listar(any(), any(), any(), any(), any())).thenReturn(Page.empty());

        mockMvc.perform(get(LISTA).with(logadoComo("PASTOR"))).andExpect(status().isOk());

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(movimentacaoService).listar(isNull(), isNull(), isNull(), isNull(), pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(20);
        assertThat(pageable.getValue().getSort()).isEqualTo(Sort.by("data"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"INVALIDO", "receita"})
    void tipoInvalidoRecebe400(String tipo) throws Exception {
        mockMvc.perform(get(LISTA).param("tipo", tipo).with(logadoComo("ADMINISTRADOR")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Valor inválido para o parâmetro 'tipo'."))
                .andExpect(jsonPath("$.path").value(LISTA));
        verifyNoInteractions(movimentacaoService);
    }

    @Test
    void categoriaQueNaoEUuidRecebe400() throws Exception {
        mockMvc.perform(get(LISTA).param("categoriaId", "dizimos").with(logadoComo("ADMINISTRADOR")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Valor inválido para o parâmetro 'categoriaId'."));
        verifyNoInteractions(movimentacaoService);
    }
}
