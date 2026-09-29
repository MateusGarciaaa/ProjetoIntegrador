// repository/MovimentacaoFinanceiraRepository.java
package br.com.churchhub.api.repository;

import br.com.churchhub.api.entity.MovimentacaoFinanceira;
import br.com.churchhub.api.entity.TipoMovimentacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public interface MovimentacaoFinanceiraRepository extends JpaRepository<MovimentacaoFinanceira, UUID> {

    Page<MovimentacaoFinanceira> findByDataBetween(LocalDate dataInicio, LocalDate dataFim, Pageable pageable);

    @Query("""
            SELECT COALESCE(SUM(m.valor), 0)
            FROM MovimentacaoFinanceira m
            WHERE m.tipo = :tipo AND m.data BETWEEN :dataInicio AND :dataFim
            """)
    BigDecimal somarPorTipo(@Param("tipo") TipoMovimentacao tipo,
                            @Param("dataInicio") LocalDate dataInicio,
                            @Param("dataFim") LocalDate dataFim);
}