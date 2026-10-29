package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.AniversarianteResponse;
import br.com.churchhub.api.dto.DashboardResponse;
import br.com.churchhub.api.dto.NovoMembroResponse;
import br.com.churchhub.api.dto.ProximoEventoResponse;
import br.com.churchhub.api.dto.ResumoFinanceiroResponse;
import br.com.churchhub.api.entity.StatusMembro;
import br.com.churchhub.api.repository.EventoRepository;
import br.com.churchhub.api.repository.MembroRepository;
import br.com.churchhub.api.repository.MovimentacaoFinanceiraFiltros;
import br.com.churchhub.api.repository.MovimentacaoFinanceiraRepository;
import br.com.churchhub.api.repository.TotaisFinanceiros;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    /** "Novos membros": cadastrados nos últimos N dias (contados a partir de agora, no Clock). */
    public static final int DIAS_NOVOS_MEMBROS = 30;

    private final MembroRepository membroRepository;
    private final EventoRepository eventoRepository;
    private final MovimentacaoFinanceiraRepository movimentacaoRepository;
    /** "Hoje" e "mês atual" no fuso da igreja (ClockConfig), não no da JVM. */
    private final Clock clock;

    /** Bloco que o perfil não vê fica null e nem chega a ser consultado. */
    public DashboardResponse gerar(VisibilidadeDashboard visibilidade) {
        LocalDate hoje = LocalDate.now(clock);

        var proximosEventos = eventoRepository
                .findTop5ByDataGreaterThanEqualOrderByDataAscHorarioAsc(hoje)
                .stream()
                .map(e -> new ProximoEventoResponse(e.getId(), e.getTitulo(), e.getData(), e.getHorario()))
                .toList();

        Long totalMembros = null;
        Long membrosAtivos = null;
        Long membrosAfastados = null;
        Long membrosVisitantes = null;
        List<AniversarianteResponse> aniversariantes = null;
        List<NovoMembroResponse> novosMembros = null;
        Long totalNovosMembros = null;
        if (visibilidade.membros()) {
            totalMembros = membroRepository.count();
            membrosAtivos = membroRepository.countByStatus(StatusMembro.ATIVO);
            membrosAfastados = membroRepository.countByStatus(StatusMembro.AFASTADO);
            membrosVisitantes = membroRepository.countByStatus(StatusMembro.VISITANTE);
            aniversariantes = membroRepository.buscarAniversariantesDoMes(hoje.getMonthValue())
                    .stream()
                    .map(m -> new AniversarianteResponse(m.getId(), m.getNome(), m.getDataNascimento()))
                    .toList();

            LocalDateTime desde = LocalDateTime.now(clock).minusDays(DIAS_NOVOS_MEMBROS);
            novosMembros = membroRepository.findTop10ByCriadoEmGreaterThanEqualOrderByCriadoEmDescNomeAsc(desde)
                    .stream()
                    .map(m -> new NovoMembroResponse(m.getId(), m.getNome(), m.getStatus(), m.getCriadoEm()))
                    .toList();
            totalNovosMembros = membroRepository.countByCriadoEmGreaterThanEqual(desde);
        }

        ResumoFinanceiroResponse resumoFinanceiro = visibilidade.financeiro()
                ? montarResumoFinanceiroDoMes(hoje)
                : null;

        return new DashboardResponse(totalMembros, membrosAtivos, membrosAfastados, membrosVisitantes,
                proximosEventos, aniversariantes, novosMembros, totalNovosMembros, resumoFinanceiro);
    }

    private ResumoFinanceiroResponse montarResumoFinanceiroDoMes(LocalDate hoje) {
        LocalDate inicioMes = hoje.withDayOfMonth(1);
        LocalDate fimMes = hoje.withDayOfMonth(hoje.lengthOfMonth());

        TotaisFinanceiros totais = movimentacaoRepository.somar(MovimentacaoFinanceiraFiltros.de(inicioMes, fimMes, null, null));
        return new ResumoFinanceiroResponse(inicioMes, fimMes, totais.receitas(), totais.despesas(), totais.saldo());
    }
}
