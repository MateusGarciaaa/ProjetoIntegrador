package br.com.churchhub.api.repository;

import br.com.churchhub.api.entity.MovimentacaoFinanceira;
import br.com.churchhub.api.entity.TipoMovimentacao;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Filtros opcionais de GET /financial, combinados numa só consulta: cada filtro ausente
 * simplesmente não entra no WHERE, sem um método de repositório por combinação.
 */
public final class MovimentacaoFinanceiraFiltros {

    private MovimentacaoFinanceiraFiltros() {
    }

    /** O período só filtra com as duas datas (comportamento anterior, mantido). */
    public static Specification<MovimentacaoFinanceira> de(LocalDate dataInicio, LocalDate dataFim,
                                                           TipoMovimentacao tipo, UUID categoriaId) {
        List<Specification<MovimentacaoFinanceira>> filtros = new ArrayList<>();
        if (dataInicio != null && dataFim != null) {
            filtros.add((raiz, consulta, cb) -> cb.between(raiz.get("data"), dataInicio, dataFim));
        }
        if (tipo != null) {
            filtros.add((raiz, consulta, cb) -> cb.equal(raiz.get("tipo"), tipo));
        }
        if (categoriaId != null) {
            // categoria.id é a própria FK: compara a coluna, sem JOIN a mais.
            filtros.add((raiz, consulta, cb) -> cb.equal(raiz.get("categoria").get("id"), categoriaId));
        }
        return Specification.allOf(filtros);
    }
}
