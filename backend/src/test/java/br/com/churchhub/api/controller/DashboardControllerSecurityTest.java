package br.com.churchhub.api.controller;

import br.com.churchhub.api.entity.Membro;
import br.com.churchhub.api.entity.StatusMembro;
import br.com.churchhub.api.repository.EventoRepository;
import br.com.churchhub.api.repository.MembroRepository;
import br.com.churchhub.api.repository.MovimentacaoFinanceiraRepository;
import br.com.churchhub.api.repository.TotaisFinanceiros;
import br.com.churchhub.api.security.JwtService;
import br.com.churchhub.api.security.SecurityConfig;
import br.com.churchhub.api.security.SecurityErrorHandler;
import br.com.churchhub.api.security.UsuarioDetailsServiceImpl;
import br.com.churchhub.api.service.DashboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * RN12 de ponta a ponta (controller + DashboardService reais, repositórios simulados):
 * todo perfil logado abre o dashboard, e cada um recebe só os blocos do que já pode ver.
 * A e P: tudo; S: membros (contagens por status, aniversariantes, novos membros) e eventos;
 * T: financeiro e eventos; M: só eventos.
 */
@WebMvcTest(DashboardController.class)
@Import({SecurityConfig.class, SecurityErrorHandler.class, DashboardService.class,
        DashboardControllerSecurityTest.RelogioFixo.class})
class DashboardControllerSecurityTest {

    private static final String DASHBOARD = "/api/v1/dashboard";

    @TestConfiguration
    static class RelogioFixo {
        @Bean
        Clock clock() {
            return Clock.fixed(Instant.parse("2026-10-15T15:00:00Z"), ZoneId.of("America/Sao_Paulo"));
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MembroRepository membroRepository;
    @MockitoBean
    private EventoRepository eventoRepository;
    @MockitoBean
    private MovimentacaoFinanceiraRepository movimentacaoRepository;
    @MockitoBean
    private JwtService jwtService;
    @MockitoBean
    private UsuarioDetailsServiceImpl usuarioDetailsService;

    private static RequestPostProcessor logadoComo(String perfil) {
        return user(perfil.toLowerCase() + "@churchhub.local").roles(perfil);
    }

    @BeforeEach
    void dados() {
        Membro aniversariante = new Membro();
        aniversariante.setId(UUID.randomUUID());
        aniversariante.setNome("Ana");
        aniversariante.setDataNascimento(LocalDate.of(1990, 10, 20));
        Membro novo = new Membro();
        novo.setId(UUID.randomUUID());
        novo.setNome("Paulo");
        novo.setStatus(StatusMembro.VISITANTE);
        novo.setCriadoEm(LocalDateTime.of(2026, 10, 14, 19, 30));

        when(eventoRepository.findTop5ByDataGreaterThanEqualOrderByDataAscHorarioAsc(any())).thenReturn(List.of());
        when(membroRepository.count()).thenReturn(25L);
        when(membroRepository.countByStatus(StatusMembro.ATIVO)).thenReturn(20L);
        when(membroRepository.countByStatus(StatusMembro.AFASTADO)).thenReturn(3L);
        when(membroRepository.countByStatus(StatusMembro.VISITANTE)).thenReturn(2L);
        // Relógio em 15/10/2026 12:00 em São Paulo: novos membros desde 15/09/2026 12:00.
        when(membroRepository.findTop10ByCriadoEmGreaterThanEqualOrderByCriadoEmDescNomeAsc(LocalDateTime.of(2026, 9, 15, 12, 0)))
                .thenReturn(List.of(novo));
        when(membroRepository.countByCriadoEmGreaterThanEqual(LocalDateTime.of(2026, 9, 15, 12, 0))).thenReturn(1L);
        when(membroRepository.buscarAniversariantesDoMes(anyInt())).thenReturn(List.of(aniversariante));
        when(movimentacaoRepository.somar(any()))
                .thenReturn(new TotaisFinanceiros(new BigDecimal("1500.00"), new BigDecimal("400.00")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMINISTRADOR", "PASTOR"})
    void administradorEPastorVeemTudo(String perfil) throws Exception {
        mockMvc.perform(get(DASHBOARD).with(logadoComo(perfil)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMembros").value(25))
                .andExpect(jsonPath("$.membrosVisitantes").value(2))
                .andExpect(jsonPath("$.novosMembros[0].nome").value("Paulo"))
                .andExpect(jsonPath("$.membrosAtivos").value(20))
                .andExpect(jsonPath("$.membrosAfastados").value(3))
                .andExpect(jsonPath("$.membrosVisitantes").value(2))
                .andExpect(jsonPath("$.novosMembros[0].nome").value("Paulo"))
                .andExpect(jsonPath("$.novosMembros[0].status").value("VISITANTE"))
                .andExpect(jsonPath("$.novosMembros[0].criadoEm").value("2026-10-14T19:30:00"))
                .andExpect(jsonPath("$.totalNovosMembros").value(1))
                .andExpect(jsonPath("$.proximosEventos").isArray())
                .andExpect(jsonPath("$.aniversariantesDoMes[0].nome").value("Ana"))
                .andExpect(jsonPath("$.resumoFinanceiroMesAtual.dataInicio").value("2026-10-01"))
                .andExpect(jsonPath("$.resumoFinanceiroMesAtual.dataFim").value("2026-10-31"))
                .andExpect(jsonPath("$.resumoFinanceiroMesAtual.saldo").value(1100.00));
    }

    @Test
    void secretarioVeMembrosESemFinanceiro() throws Exception {
        mockMvc.perform(get(DASHBOARD).with(logadoComo("SECRETARIO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMembros").value(25))
                .andExpect(jsonPath("$.membrosVisitantes").value(2))
                .andExpect(jsonPath("$.novosMembros[0].nome").value("Paulo"))
                .andExpect(jsonPath("$.aniversariantesDoMes[0].nome").value("Ana"))
                .andExpect(jsonPath("$.proximosEventos").isArray())
                .andExpect(jsonPath("$.resumoFinanceiroMesAtual").value(nullValue()));
        verifyNoInteractions(movimentacaoRepository);
    }

    @Test
    void tesoureiroVeFinanceiroESemMembros() throws Exception {
        mockMvc.perform(get(DASHBOARD).with(logadoComo("TESOUREIRO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMembros").value(nullValue()))
                .andExpect(jsonPath("$.membrosAtivos").value(nullValue()))
                .andExpect(jsonPath("$.membrosAfastados").value(nullValue()))
                .andExpect(jsonPath("$.membrosVisitantes").value(nullValue()))
                .andExpect(jsonPath("$.novosMembros").value(nullValue()))
                .andExpect(jsonPath("$.totalNovosMembros").value(nullValue()))
                .andExpect(jsonPath("$.aniversariantesDoMes").value(nullValue()))
                .andExpect(jsonPath("$.proximosEventos").isArray())
                .andExpect(jsonPath("$.resumoFinanceiroMesAtual.totalReceitas").value(1500.00));
        verify(membroRepository, never()).count();
        verify(membroRepository, never()).buscarAniversariantesDoMes(anyInt());
        verify(membroRepository, never()).countByCriadoEmGreaterThanEqual(any());
    }

    @Test
    void membroSoVeEventos() throws Exception {
        mockMvc.perform(get(DASHBOARD).with(logadoComo("MEMBRO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proximosEventos").isArray())
                .andExpect(jsonPath("$.totalMembros").value(nullValue()))
                .andExpect(jsonPath("$.membrosAtivos").value(nullValue()))
                .andExpect(jsonPath("$.membrosAfastados").value(nullValue()))
                .andExpect(jsonPath("$.membrosVisitantes").value(nullValue()))
                .andExpect(jsonPath("$.novosMembros").value(nullValue()))
                .andExpect(jsonPath("$.totalNovosMembros").value(nullValue()))
                .andExpect(jsonPath("$.aniversariantesDoMes").value(nullValue()))
                .andExpect(jsonPath("$.resumoFinanceiroMesAtual").value(nullValue()));
        verifyNoInteractions(membroRepository, movimentacaoRepository);
    }

    @Test
    void semLoginRecebe401() throws Exception {
        mockMvc.perform(get(DASHBOARD)).andExpect(status().isUnauthorized());
        verifyNoInteractions(membroRepository, eventoRepository, movimentacaoRepository);
    }
}
