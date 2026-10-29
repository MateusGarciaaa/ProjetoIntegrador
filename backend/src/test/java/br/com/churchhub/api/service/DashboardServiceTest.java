package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.DashboardResponse;
import br.com.churchhub.api.dto.NovoMembroResponse;
import br.com.churchhub.api.entity.Membro;
import br.com.churchhub.api.entity.StatusMembro;
import br.com.churchhub.api.repository.EventoRepository;
import br.com.churchhub.api.repository.MembroRepository;
import br.com.churchhub.api.repository.MovimentacaoFinanceiraRepository;
import br.com.churchhub.api.repository.TotaisFinanceiros;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * "Hoje" e "mês atual" do dashboard vêm do Clock da aplicação, no fuso da igreja.
 * O instante usado é 01:30 UTC de 01/11/2026 — ainda 31/10, 22:30, em São Paulo: com o
 * relógio em UTC, o dashboard já mostraria novembro.
 * RN12: bloco que o perfil não vê vem null e o repositório dele nem é consultado.
 */
@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    private static final Clock VESPERA_DE_NOVEMBRO_EM_SAO_PAULO =
            Clock.fixed(Instant.parse("2026-11-01T01:30:00Z"), ZoneId.of("America/Sao_Paulo"));
    private static final LocalDate HOJE = LocalDate.of(2026, 10, 31);
    private static final VisibilidadeDashboard TUDO = new VisibilidadeDashboard(true, true);
    private static final VisibilidadeDashboard SO_EVENTOS = new VisibilidadeDashboard(false, false);

    @Mock
    private MembroRepository membroRepository;
    @Mock
    private EventoRepository eventoRepository;
    @Mock
    private MovimentacaoFinanceiraRepository movimentacaoRepository;

    private DashboardService servico() {
        return new DashboardService(membroRepository, eventoRepository, movimentacaoRepository, VESPERA_DE_NOVEMBRO_EM_SAO_PAULO);
    }

    @Test
    void proximosEventosEAniversariantesUsamOHojeDaIgreja() {
        when(eventoRepository.findTop5ByDataGreaterThanEqualOrderByDataAscHorarioAsc(HOJE)).thenReturn(List.of());
        when(membroRepository.buscarAniversariantesDoMes(10)).thenReturn(List.of());

        servico().gerar(new VisibilidadeDashboard(true, false));

        verify(eventoRepository).findTop5ByDataGreaterThanEqualOrderByDataAscHorarioAsc(HOJE);
        verify(membroRepository).buscarAniversariantesDoMes(10);
    }

    @Test
    void resumoFinanceiroCobreOMesAtualDaIgreja() {
        when(eventoRepository.findTop5ByDataGreaterThanEqualOrderByDataAscHorarioAsc(HOJE)).thenReturn(List.of());
        when(membroRepository.buscarAniversariantesDoMes(10)).thenReturn(List.of());
        when(movimentacaoRepository.somar(any()))
                .thenReturn(new TotaisFinanceiros(new BigDecimal("1500.00"), new BigDecimal("400.00")));

        var resumo = servico().gerar(TUDO).resumoFinanceiroMesAtual();

        assertThat(resumo.dataInicio()).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(resumo.dataFim()).isEqualTo(LocalDate.of(2026, 10, 31));
        assertThat(resumo.totalReceitas()).isEqualByComparingTo("1500.00");
        assertThat(resumo.totalDespesas()).isEqualByComparingTo("400.00");
        assertThat(resumo.saldo()).isEqualByComparingTo("1100.00");
    }

    @Test
    void quemSoVeEventosNaoRecebeNemConsultaMembrosOuFinanceiro() {
        when(eventoRepository.findTop5ByDataGreaterThanEqualOrderByDataAscHorarioAsc(HOJE)).thenReturn(List.of());

        DashboardResponse resposta = servico().gerar(SO_EVENTOS);

        assertThat(resposta.proximosEventos()).isEmpty();
        assertThat(resposta.totalMembros()).isNull();
        assertThat(resposta.membrosAtivos()).isNull();
        assertThat(resposta.membrosAfastados()).isNull();
        assertThat(resposta.membrosVisitantes()).isNull();
        assertThat(resposta.novosMembros()).isNull();
        assertThat(resposta.totalNovosMembros()).isNull();
        assertThat(resposta.aniversariantesDoMes()).isNull();
        assertThat(resposta.resumoFinanceiroMesAtual()).isNull();
        verifyNoInteractions(membroRepository, movimentacaoRepository);
    }

    @Test
    void membrosSemFinanceiro() {
        when(eventoRepository.findTop5ByDataGreaterThanEqualOrderByDataAscHorarioAsc(HOJE)).thenReturn(List.of());
        when(membroRepository.count()).thenReturn(25L);
        when(membroRepository.countByStatus(StatusMembro.ATIVO)).thenReturn(16L);
        when(membroRepository.countByStatus(StatusMembro.AFASTADO)).thenReturn(5L);
        when(membroRepository.countByStatus(StatusMembro.VISITANTE)).thenReturn(4L);
        when(membroRepository.buscarAniversariantesDoMes(10)).thenReturn(List.of());

        DashboardResponse resposta = servico().gerar(new VisibilidadeDashboard(true, false));

        assertThat(resposta.totalMembros()).isEqualTo(25L);
        assertThat(resposta.membrosAtivos()).isEqualTo(16L);
        assertThat(resposta.membrosAfastados()).isEqualTo(5L);
        assertThat(resposta.membrosVisitantes()).isEqualTo(4L);
        assertThat(resposta.aniversariantesDoMes()).isEmpty();
        assertThat(resposta.novosMembros()).isEmpty();
        assertThat(resposta.totalNovosMembros()).isZero();
        assertThat(resposta.resumoFinanceiroMesAtual()).isNull();
        verifyNoInteractions(movimentacaoRepository);
    }

    /** 30 dias para trás a partir do agora do Clock (22:30 de 31/10 em São Paulo), não da JVM. */
    @Test
    void novosMembrosSaoOsCadastradosNosUltimos30DiasDoRelogioDaIgreja() {
        LocalDateTime desde = LocalDateTime.of(2026, 10, 1, 22, 30);
        Membro novo = new Membro();
        novo.setId(UUID.randomUUID());
        novo.setNome("Paulo Henrique");
        novo.setStatus(StatusMembro.VISITANTE);
        novo.setCriadoEm(LocalDateTime.of(2026, 10, 30, 9, 15));
        when(eventoRepository.findTop5ByDataGreaterThanEqualOrderByDataAscHorarioAsc(HOJE)).thenReturn(List.of());
        when(membroRepository.buscarAniversariantesDoMes(10)).thenReturn(List.of());
        when(membroRepository.findTop10ByCriadoEmGreaterThanEqualOrderByCriadoEmDescNomeAsc(desde)).thenReturn(List.of(novo));
        when(membroRepository.countByCriadoEmGreaterThanEqual(desde)).thenReturn(12L);

        DashboardResponse resposta = servico().gerar(new VisibilidadeDashboard(true, false));

        assertThat(DashboardService.DIAS_NOVOS_MEMBROS).isEqualTo(30);
        assertThat(resposta.novosMembros()).containsExactly(
                new NovoMembroResponse(novo.getId(), "Paulo Henrique", StatusMembro.VISITANTE, LocalDateTime.of(2026, 10, 30, 9, 15)));
        // A lista vem limitada (top 10); o total conta todos os do período.
        assertThat(resposta.totalNovosMembros()).isEqualTo(12L);
        verify(membroRepository).countByCriadoEmGreaterThanEqual(desde);
    }

    @Test
    void financeiroSemMembros() {
        when(eventoRepository.findTop5ByDataGreaterThanEqualOrderByDataAscHorarioAsc(HOJE)).thenReturn(List.of());
        when(movimentacaoRepository.somar(any())).thenReturn(new TotaisFinanceiros(BigDecimal.ZERO, BigDecimal.ZERO));

        DashboardResponse resposta = servico().gerar(new VisibilidadeDashboard(false, true));

        assertThat(resposta.totalMembros()).isNull();
        assertThat(resposta.aniversariantesDoMes()).isNull();
        assertThat(resposta.resumoFinanceiroMesAtual()).isNotNull();
        verifyNoInteractions(membroRepository);
    }

    @ParameterizedTest
    @CsvSource({
            "ROLE_ADMINISTRADOR, true, true",
            "ROLE_PASTOR, true, true",
            "ROLE_SECRETARIO, true, false",
            "ROLE_TESOUREIRO, false, true",
            "ROLE_MEMBRO, false, false",
            "ROLE_DESCONHECIDO, false, false",
            "ADMINISTRADOR, false, false"
    })
    void visibilidadePorPerfil(String autoridade, boolean membros, boolean financeiro) {
        assertThat(VisibilidadeDashboard.dasAutoridades(List.of(autoridade)))
                .isEqualTo(new VisibilidadeDashboard(membros, financeiro));
    }
}
