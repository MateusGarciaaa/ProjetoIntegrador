// dto/MovimentacaoFinanceiraResponse.java
package br.com.churchhub.api.dto;

import br.com.churchhub.api.entity.TipoMovimentacao;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record MovimentacaoFinanceiraResponse(
        UUID id,
        String descricao,
        BigDecimal valor,
        LocalDate data,
        TipoMovimentacao tipo,
        CategoriaFinanceiraResponse categoria,
        UUID membroId,
        String membroNome) {
}