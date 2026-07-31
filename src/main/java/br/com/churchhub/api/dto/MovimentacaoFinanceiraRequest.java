// dto/MovimentacaoFinanceiraRequest.java
package br.com.churchhub.api.dto;

import br.com.churchhub.api.entity.TipoMovimentacao;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record MovimentacaoFinanceiraRequest(

        @NotBlank(message = "A descrição é obrigatória")
        String descricao,

        @NotNull(message = "O valor é obrigatório")
        @DecimalMin(value = "0.01", message = "O valor deve ser positivo")
        BigDecimal valor,

        @NotNull(message = "A data é obrigatória")
        LocalDate data,

        @NotNull(message = "O tipo é obrigatório")
        TipoMovimentacao tipo,

        @NotNull(message = "A categoria é obrigatória")
        UUID categoriaId,

        UUID membroId) {
}