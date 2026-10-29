package br.com.churchhub.api.repository;

import br.com.churchhub.api.dto.CategoriaFinanceiraResponse;
import br.com.churchhub.api.dto.PontoSerieFinanceiraResponse;
import br.com.churchhub.api.dto.TotalPorCategoriaResponse;
import br.com.churchhub.api.entity.AgrupamentoSerie;
import br.com.churchhub.api.entity.CategoriaFinanceira;
import br.com.churchhub.api.entity.MovimentacaoFinanceira;
import br.com.churchhub.api.entity.TipoMovimentacao;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.LocalDateField;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Criteria API em vez de JPQL fixo: a mesma {@link Specification} da listagem entra no WHERE,
 * então período, tipo e categoria filtram as somas exatamente como filtram a lista.
 * Receitas e despesas saem na mesma linha com SUM(CASE WHEN tipo = ... THEN valor ELSE 0).
 */
public class MovimentacaoFinanceiraAgregacoesImpl implements MovimentacaoFinanceiraAgregacoes {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public TotaisFinanceiros somar(Specification<MovimentacaoFinanceira> filtros) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> consulta = cb.createTupleQuery();
        Root<MovimentacaoFinanceira> raiz = consulta.from(MovimentacaoFinanceira.class);
        consulta.multiselect(somaDoTipo(cb, raiz, TipoMovimentacao.RECEITA), somaDoTipo(cb, raiz, TipoMovimentacao.DESPESA));
        filtrar(consulta, raiz, cb, filtros);

        Tuple linha = entityManager.createQuery(consulta).getSingleResult();
        return new TotaisFinanceiros(linha.get(0, BigDecimal.class), linha.get(1, BigDecimal.class));
    }

    @Override
    public List<PontoSerieFinanceiraResponse> serie(Specification<MovimentacaoFinanceira> filtros,
                                                    AgrupamentoSerie agrupamento) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> consulta = cb.createTupleQuery();
        Root<MovimentacaoFinanceira> raiz = consulta.from(MovimentacaoFinanceira.class);
        Expression<LocalDate> data = raiz.get("data");
        boolean porMes = agrupamento == AgrupamentoSerie.MES;
        List<Expression<?>> grupo = porMes
                ? List.of(cb.extract(LocalDateField.YEAR, data), cb.extract(LocalDateField.MONTH, data))
                : List.of(data);

        consulta.multiselect(
                somaDoTipo(cb, raiz, TipoMovimentacao.RECEITA),
                somaDoTipo(cb, raiz, TipoMovimentacao.DESPESA),
                grupo.getFirst(),
                grupo.getLast());
        filtrar(consulta, raiz, cb, filtros);
        consulta.groupBy(grupo);
        consulta.orderBy(grupo.stream().map(cb::asc).toList());

        return entityManager.createQuery(consulta).getResultList().stream()
                .map(linha -> {
                    BigDecimal receitas = linha.get(0, BigDecimal.class);
                    BigDecimal despesas = linha.get(1, BigDecimal.class);
                    LocalDate periodo = porMes
                            ? LocalDate.of(linha.get(2, Integer.class), linha.get(3, Integer.class), 1)
                            : linha.get(2, LocalDate.class);
                    return new PontoSerieFinanceiraResponse(periodo, receitas, despesas, receitas.subtract(despesas));
                })
                .toList();
    }

    @Override
    public List<TotalPorCategoriaResponse> totaisPorCategoria(Specification<MovimentacaoFinanceira> filtros) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> consulta = cb.createTupleQuery();
        Root<MovimentacaoFinanceira> raiz = consulta.from(MovimentacaoFinanceira.class);
        Join<MovimentacaoFinanceira, CategoriaFinanceira> categoria = raiz.join("categoria");
        Expression<BigDecimal> total = cb.sum(raiz.get("valor"));

        consulta.multiselect(categoria.get("id"), categoria.get("nome"), categoria.get("tipo"), total, cb.count(raiz));
        filtrar(consulta, raiz, cb, filtros);
        consulta.groupBy(categoria.get("id"), categoria.get("nome"), categoria.get("tipo"));
        consulta.orderBy(cb.desc(total), cb.asc(categoria.get("nome")));

        return entityManager.createQuery(consulta).getResultList().stream()
                .map(linha -> new TotalPorCategoriaResponse(
                        new CategoriaFinanceiraResponse(
                                linha.get(0, UUID.class),
                                linha.get(1, String.class),
                                linha.get(2, TipoMovimentacao.class)),
                        linha.get(3, BigDecimal.class),
                        linha.get(4, Long.class)))
                .toList();
    }

    private static Expression<BigDecimal> somaDoTipo(CriteriaBuilder cb, Root<MovimentacaoFinanceira> raiz,
                                                     TipoMovimentacao tipo) {
        Expression<BigDecimal> valorDoTipo = cb.<BigDecimal>selectCase()
                .when(cb.equal(raiz.get("tipo"), tipo), raiz.<BigDecimal>get("valor"))
                .otherwise(BigDecimal.ZERO);
        return cb.coalesce(cb.sum(valorDoTipo), BigDecimal.ZERO);
    }

    private static void filtrar(CriteriaQuery<?> consulta, Root<MovimentacaoFinanceira> raiz, CriteriaBuilder cb,
                                Specification<MovimentacaoFinanceira> filtros) {
        Predicate where = filtros.toPredicate(raiz, consulta, cb);
        if (where != null) {
            consulta.where(where);
        }
    }
}
