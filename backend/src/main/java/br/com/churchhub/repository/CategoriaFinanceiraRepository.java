// repository/CategoriaFinanceiraRepository.java
package br.com.churchhub.api.repository;

import br.com.churchhub.api.entity.CategoriaFinanceira;
import br.com.churchhub.api.entity.TipoMovimentacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CategoriaFinanceiraRepository extends JpaRepository<CategoriaFinanceira, UUID> {
    boolean existsByNomeAndTipo(String nome, TipoMovimentacao tipo);
    List<CategoriaFinanceira> findByTipo(TipoMovimentacao tipo);
}