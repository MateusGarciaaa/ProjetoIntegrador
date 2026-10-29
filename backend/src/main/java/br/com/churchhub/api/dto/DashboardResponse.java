package br.com.churchhub.api.dto;

import java.util.List;

/**
 * Blocos que o perfil não pode ver (RN12) vêm null: as contagens de membros (total, ativos,
 * afastados, visitantes), aniversariantesDoMes e os novos membros (só A, P, S);
 * resumoFinanceiroMesAtual (só A, P, T). proximosEventos vem sempre (lista vazia se não houver).
 * novosMembros: os cadastrados nos últimos DashboardService.DIAS_NOVOS_MEMBROS dias, no máximo 10,
 * mais recentes primeiro; totalNovosMembros conta todos os do período.
 */
public record DashboardResponse(
        Long totalMembros,
        Long membrosAtivos,
        Long membrosAfastados,
        Long membrosVisitantes,
        List<ProximoEventoResponse> proximosEventos,
        List<AniversarianteResponse> aniversariantesDoMes,
        List<NovoMembroResponse> novosMembros,
        Long totalNovosMembros,
        ResumoFinanceiroResponse resumoFinanceiroMesAtual) {
}
