import { useMemo } from 'react';
import { ORDENACAO_MOVIMENTACOES, TAMANHO_PAGINA_MOVIMENTACOES, TAMANHO_PAGINA_PERIODO } from '../constants/financeiro';
import { financeiroService } from '../services/financial/financeiroService';
import { useConsultaPaginada } from './useConsultaPaginada';

function buscarMovimentacoes(consulta, opcoes) {
  return financeiroService.listar(consulta, opcoes);
}

function buscarResumo(consulta, opcoes) {
  return financeiroService.resumo(consulta, opcoes);
}

/** Página da lista (/financeiro): período, tipo e categoria filtrados e paginados pelo servidor. */
export function useMovimentacoes({ de, ate, tipo, categoria, pagina }) {
  const consulta = useMemo(
    () => ({
      dataInicio: de,
      dataFim: ate,
      tipo,
      categoriaId: categoria,
      pagina,
      tamanho: TAMANHO_PAGINA_MOVIMENTACOES,
      ordenacao: ORDENACAO_MOVIMENTACOES,
    }),
    [de, ate, tipo, categoria, pagina],
  );
  return useConsultaPaginada(buscarMovimentacoes, consulta);
}

/**
 * Todas as movimentações do período (de/ate, sempre os dois) numa só página grande, das mais
 * recentes para as mais antigas: o gráfico e os totais por categoria são calculados no cliente,
 * porque o backend não tem série nem agrupamento. incompleto: havia mais do que cabe numa página.
 */
export function useMovimentacoesDoPeriodo({ de, ate }) {
  const consulta = useMemo(
    () => ({ dataInicio: de, dataFim: ate, pagina: 0, tamanho: TAMANHO_PAGINA_PERIODO, ordenacao: ORDENACAO_MOVIMENTACOES }),
    [de, ate],
  );
  const resultado = useConsultaPaginada(buscarMovimentacoes, consulta);
  const { pagina } = resultado;
  return {
    ...resultado,
    movimentacoes: pagina?.content ?? null,
    incompleto: Boolean(pagina && pagina.totalElements > pagina.content.length),
    recebidos: pagina?.content.length ?? 0,
    total: pagina?.totalElements ?? 0,
  };
}

/** Totais oficiais do período (GET /financial/summary). resumo: ResumoFinanceiroResponse, ou null enquanto carrega. */
export function useResumoFinanceiro({ de, ate }) {
  const consulta = useMemo(() => ({ dataInicio: de, dataFim: ate }), [de, ate]);
  const { pagina, ...resto } = useConsultaPaginada(buscarResumo, consulta);
  return { ...resto, resumo: pagina };
}
