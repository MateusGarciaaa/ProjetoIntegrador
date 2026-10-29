package br.com.churchhub.api.dto;

import java.util.List;

/**
 * Blocos que o perfil não pode ver (RN12) vêm null: totalMembros, membrosAtivos e
 * aniversariantesDoMes (só A, P, S); resumoFinanceiroMesAtual (só A, P, T).
 * proximosEventos vem sempre (lista vazia se não houver).
 */
public record DashboardResponse(
        Long totalMembros,
        Long membrosAtivos,
        List<ProximoEventoResponse> proximosEventos,
        List<AniversarianteResponse> aniversariantesDoMes,
        ResumoFinanceiroResponse resumoFinanceiroMesAtual) {
}
