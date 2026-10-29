package br.com.churchhub.api.dto;

import java.math.BigDecimal;

/** Soma e quantidade de lançamentos de uma categoria no período (GET /financial/summary/categories). */
public record TotalPorCategoriaResponse(
        CategoriaFinanceiraResponse categoria,
        BigDecimal total,
        long quantidade) {
}
