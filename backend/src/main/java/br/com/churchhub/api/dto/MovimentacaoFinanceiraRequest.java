package br.com.churchhub.api.dto;

import br.com.churchhub.api.entity.TipoMovimentacao;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record MovimentacaoFinanceiraRequest(

        @NotBlank(message = "A descrição é obrigatória")
        @Size(max = 255, message = "A descrição deve ter no máximo 255 caracteres")
        String descricao,

        @NotNull(message = "O valor é obrigatório")
        @DecimalMin(value = "0.01", message = "O valor deve ser positivo")
        @Digits(integer = 10, fraction = 2, message = "O valor deve ter até 10 dígitos inteiros e 2 casas decimais")
        BigDecimal valor,

        @NotNull(message = "A data é obrigatória")
        LocalDate data,

        @NotNull(message = "O tipo é obrigatório")
        TipoMovimentacao tipo,

        @NotNull(message = "A categoria é obrigatória")
        UUID categoriaId,

        UUID membroId) {
}