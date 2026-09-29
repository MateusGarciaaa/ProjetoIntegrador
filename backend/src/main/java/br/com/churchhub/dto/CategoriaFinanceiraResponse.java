// dto/CategoriaFinanceiraResponse.java
package br.com.churchhub.api.dto;

import br.com.churchhub.api.entity.TipoMovimentacao;

import java.util.UUID;

public record CategoriaFinanceiraResponse(
        UUID id,
        String nome,
        TipoMovimentacao tipo) {
}