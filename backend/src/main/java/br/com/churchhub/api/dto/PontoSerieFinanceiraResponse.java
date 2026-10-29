package br.com.churchhub.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Um ponto da série de receitas e despesas. periodo: o próprio dia (agrupamento DIA)
 * ou o primeiro dia do mês (agrupamento MES).
 */
public record PontoSerieFinanceiraResponse(
        LocalDate periodo,
        BigDecimal totalReceitas,
        BigDecimal totalDespesas,
        BigDecimal saldo) {
}
