package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.AniversarianteResponse;
import br.com.churchhub.api.dto.DashboardResponse;
import br.com.churchhub.api.dto.ProximoEventoResponse;
import br.com.churchhub.api.dto.ResumoFinanceiroResponse;
import br.com.churchhub.api.entity.StatusMembro;
import br.com.churchhub.api.entity.TipoMovimentacao;
import br.com.churchhub.api.repository.EventoRepository;
import br.com.churchhub.api.repository.MembroRepository;
import br.com.churchhub.api.repository.MovimentacaoFinanceiraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MembroRepository membroRepository;
    private final EventoRepository eventoRepository;
    private final MovimentacaoFinanceiraRepository movimentacaoRepository;
    /** "Hoje" e "mês atual" no fuso da igreja (ClockConfig), não no da JVM. */
    private final Clock clock;

    public DashboardResponse gerar(boolean incluirDadosFinanceiros) {
        LocalDate hoje = LocalDate.now(clock);
        long totalMembros = membroRepository.count();
        long membrosAtivos = membroRepository.countByStatus(StatusMembro.ATIVO);

        var proximosEventos = eventoRepository
                .findTop5ByDataGreaterThanEqualOrderByDataAscHorarioAsc(hoje)
                .stream()
                .map(e -> new ProximoEventoResponse(e.getId(), e.getTitulo(), e.getData(), e.getHorario()))
                .toList();

        var aniversariantes = membroRepository.buscarAniversariantesDoMes(hoje.getMonthValue())
                .stream()
                .map(m -> new AniversarianteResponse(m.getId(), m.getNome(), m.getDataNascimento()))
                .toList();

        ResumoFinanceiroResponse resumoFinanceiro = incluirDadosFinanceiros
                ? montarResumoFinanceiroDoMes(hoje)
                : null;

        return new DashboardResponse(totalMembros, membrosAtivos, proximosEventos, aniversariantes, resumoFinanceiro);
    }

    private ResumoFinanceiroResponse montarResumoFinanceiroDoMes(LocalDate hoje) {
        LocalDate inicioMes = hoje.withDayOfMonth(1);
        LocalDate fimMes = hoje.withDayOfMonth(hoje.lengthOfMonth());

        BigDecimal receitas = movimentacaoRepository.somarPorTipo(TipoMovimentacao.RECEITA, inicioMes, fimMes);
        BigDecimal despesas = movimentacaoRepository.somarPorTipo(TipoMovimentacao.DESPESA, inicioMes, fimMes);

        return new ResumoFinanceiroResponse(inicioMes, fimMes, receitas, despesas, receitas.subtract(despesas));
    }
}