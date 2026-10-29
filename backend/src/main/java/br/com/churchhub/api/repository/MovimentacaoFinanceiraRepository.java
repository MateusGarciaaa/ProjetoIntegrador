package br.com.churchhub.api.repository;

import br.com.churchhub.api.entity.MovimentacaoFinanceira;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

/**
 * As leituras que viram MovimentacaoFinanceiraResponse trazem categoria e membro na mesma
 * consulta (LEFT JOIN): sem isso, com open-in-view desligado, o mapper esbarraria em proxies
 * LAZY fora da sessão, e cada linha da página dispararia mais duas consultas (N+1).
 * São relações *-to-one, então o JOIN não multiplica linhas e a paginação continua no banco.
 * A listagem e as somas ({@link MovimentacaoFinanceiraAgregacoes}) passam sempre por
 * {@link MovimentacaoFinanceiraFiltros} (período, tipo e categoria opcionais).
 */
public interface MovimentacaoFinanceiraRepository extends JpaRepository<MovimentacaoFinanceira, UUID>,
        JpaSpecificationExecutor<MovimentacaoFinanceira>, MovimentacaoFinanceiraAgregacoes {

    @Override
    @EntityGraph(attributePaths = {"categoria", "membro"})
    Page<MovimentacaoFinanceira> findAll(Specification<MovimentacaoFinanceira> filtros, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"categoria", "membro"})
    Optional<MovimentacaoFinanceira> findById(UUID id);

    boolean existsByMembroId(UUID membroId);
}
