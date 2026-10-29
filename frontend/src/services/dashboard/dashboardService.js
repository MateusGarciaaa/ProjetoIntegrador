import { httpClient } from '../http/httpClient';

/**
 * GET /dashboard (qualquer perfil logado). DashboardResponse { totalMembros, membrosAtivos,
 * proximosEventos[≤5]{id,titulo,data,horario}, aniversariantesDoMes[{id,nome,dataNascimento}],
 * resumoFinanceiroMesAtual }: o bloco que o perfil não pode ver vem null (RN12).
 */
export const dashboardService = {
  async obter(_consulta, { signal } = {}) {
    const { data } = await httpClient.get('/dashboard', { signal });
    return data;
  },
};
