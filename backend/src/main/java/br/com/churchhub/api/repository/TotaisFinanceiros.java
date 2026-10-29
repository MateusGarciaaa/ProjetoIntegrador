package br.com.churchhub.api.repository;

import java.math.BigDecimal;

/** Receitas e despesas somadas no banco (COALESCE 0 quando não há lançamento). */
public record TotaisFinanceiros(BigDecimal receitas, BigDecimal despesas) {

    public BigDecimal saldo() {
        return receitas.subtract(despesas);
    }
}
