// dto/ResumoFinanceiroResponse.java
package br.com.churchhub.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ResumoFinanceiroResponse(
        LocalDate dataInicio,
        LocalDate dataFim,
        BigDecimal totalReceitas,
        BigDecimal totalDespesas,
        BigDecimal saldo) {
}