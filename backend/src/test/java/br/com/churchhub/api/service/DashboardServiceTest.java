package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.DashboardResponse;
import br.com.churchhub.api.entity.TipoMovimentacao;
import br.com.churchhub.api.repository.EventoRepository;
import br.com.churchhub.api.repository.MembroRepository;
import br.com.churchhub.api.repository.MovimentacaoFinanceiraRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * "Hoje" e "mês atual" do dashboard vêm do Clock da aplicação, no fuso da igreja.
 * O instante usado é 01:30 UTC de 01/11/2026 — ainda 31/10, 22:30, em São Paulo: com o
 * relógio em UTC, o dashboard já mostraria novembro.
 */
@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    private static final Clock VESPERA_DE_NOVEMBRO_EM_SAO_PAULO =
            Clock.fixed(Instant.parse("2026-11-01T01:30:00Z"), ZoneId.of("America/Sao_Paulo"));
    private static final LocalDate HOJE = LocalDate.of(2026, 10, 31);

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

        DashboardResponse resposta = servico().gerar(false);

        verify(eventoRepository).findTop5ByDataGreaterThanEqualOrderByDataAscHorarioAsc(HOJE);
        verify(membroRepository).buscarAniversariantesDoMes(10);
        assertThat(resposta.resumoFinanceiroMesAtual()).isNull();
        verifyNoInteractions(movimentacaoRepository);
    }

    @Test
    void resumoFinanceiroCobreOMesAtualDaIgreja() {
        LocalDate inicio = LocalDate.of(2026, 10, 1);
        LocalDate fim = LocalDate.of(2026, 10, 31);
        when(eventoRepository.findTop5ByDataGreaterThanEqualOrderByDataAscHorarioAsc(HOJE)).thenReturn(List.of());
        when(membroRepository.buscarAniversariantesDoMes(10)).thenReturn(List.of());
        when(movimentacaoRepository.somarPorTipo(TipoMovimentacao.RECEITA, inicio, fim)).thenReturn(new BigDecimal("1500.00"));
        when(movimentacaoRepository.somarPorTipo(TipoMovimentacao.DESPESA, inicio, fim)).thenReturn(new BigDecimal("400.00"));

        var resumo = servico().gerar(true).resumoFinanceiroMesAtual();

        assertThat(resumo.dataInicio()).isEqualTo(inicio);
        assertThat(resumo.dataFim()).isEqualTo(fim);
        assertThat(resumo.saldo()).isEqualByComparingTo("1100.00");
    }
}
