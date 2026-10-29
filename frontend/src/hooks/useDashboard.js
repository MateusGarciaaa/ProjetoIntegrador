import { dashboardService } from '../services/dashboard/dashboardService';
import { useConsultaPaginada } from './useConsultaPaginada';

const SEM_PARAMETROS = Object.freeze({});

function buscarDashboard(consulta, opcoes) {
  return dashboardService.obter(consulta, opcoes);
}

/**
 * GET /dashboard: totais de membros, próximos eventos, aniversariantes (blocos que o perfil não vê
 * chegam null, RN12). dashboard: DashboardResponse, ou null enquanto carrega.
 */
export function useDashboard() {
  const { pagina, ...resto } = useConsultaPaginada(buscarDashboard, SEM_PARAMETROS);
  return { ...resto, dashboard: pagina };
}
