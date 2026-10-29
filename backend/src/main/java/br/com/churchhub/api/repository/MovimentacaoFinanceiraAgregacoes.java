package br.com.churchhub.api.repository;

import br.com.churchhub.api.dto.PontoSerieFinanceiraResponse;
import br.com.churchhub.api.dto.TotalPorCategoriaResponse;
import br.com.churchhub.api.entity.AgrupamentoSerie;
import br.com.churchhub.api.entity.MovimentacaoFinanceira;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

/**
 * Somas do Financeiro feitas no banco (SUM ... GROUP BY), com os mesmos filtros da listagem
 * ({@link MovimentacaoFinanceiraFiltros}): cada método é uma consulta só, qualquer que seja o
 * número de lançamentos do período. Implementado em {@link MovimentacaoFinanceiraAgregacoesImpl}.
 */
public interface MovimentacaoFinanceiraAgregacoes {

    TotaisFinanceiros somar(Specification<MovimentacaoFinanceira> filtros);

    /** Só os dias/meses com lançamento, do mais antigo para o mais recente. */
    List<PontoSerieFinanceiraResponse> serie(Specification<MovimentacaoFinanceira> filtros, AgrupamentoSerie agrupamento);

    /** Do maior total para o menor (empate: nome da categoria). */
    List<TotalPorCategoriaResponse> totaisPorCategoria(Specification<MovimentacaoFinanceira> filtros);
}
