// dto/DashboardResponse.java
package br.com.churchhub.api.dto;

import java.util.List;

public record DashboardResponse(
        long totalMembros,
        long membrosAtivos,
        List<ProximoEventoResponse> proximosEventos,
        List<AniversarianteResponse> aniversariantesDoMes,
        ResumoFinanceiroResponse resumoFinanceiroMesAtual) {
}