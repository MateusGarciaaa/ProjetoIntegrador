// dto/CategoriaFinanceiraRequest.java
package br.com.churchhub.api.dto;

import br.com.churchhub.api.entity.TipoMovimentacao;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CategoriaFinanceiraRequest(
        @NotBlank(message = "O nome da categoria é obrigatório")
        String nome,

        @NotNull(message = "O tipo da categoria é obrigatório")
        TipoMovimentacao tipo) {
}