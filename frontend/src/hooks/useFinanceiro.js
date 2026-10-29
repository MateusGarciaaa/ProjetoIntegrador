import { useMemo } from 'react';
import { ORDENACAO_MOVIMENTACOES, TAMANHO_PAGINA_MOVIMENTACOES, TAMANHO_PAGINA_PERIODO } from '../constants/financeiro';
import { financeiroService } from '../services/financial/financeiroService';
import { useConsultaPaginada } from './useConsultaPaginada';

function buscarMovimentacoes(consulta, opcoes) {
  return financeiroService.listar(consulta, opcoes);
}

/** Todas as páginas do período, uma depois da outra (a ordem data/id é estável entre as páginas). */
async function buscarTodasAsMovimentacoes(consulta, opcoes) {
  const movimentacoes = [];
  for (let pagina = 0; ; pagina += 1) {
    const resultado = await financeiroService.listar({ ...consulta, pagina }, opcoes);
    movimentacoes.push(...resultado.content);
    if (pagina + 1 >= resultado.totalPages || resultado.content.length === 0) return movimentacoes;
  }
}

function buscarResumo(consulta, opcoes) {
  return financeiroService.resumo(consulta, opcoes);
}

function buscarSerie(consulta, opcoes) {
  return financeiroService.serie(consulta, opcoes);
}

function buscarTotaisPorCategoria(consulta, opcoes) {
  return financeiroService.totaisPorCategoria(consulta, opcoes);
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
 * Todos os lançamentos do período (de/ate), das mais recentes para as mais antigas, para a lista
 * do relatório impresso. Vêm em páginas de 2000 (o máximo do Spring) até a última: sem limite.
 * Os totais não saem daqui: vêm somados do backend.
 */
export function useMovimentacoesDoPeriodo({ de, ate }) {
  const consulta = useMemo(
    () => ({ dataInicio: de, dataFim: ate, tamanho: TAMANHO_PAGINA_PERIODO, ordenacao: ORDENACAO_MOVIMENTACOES }),
    [de, ate],
  );
  const { pagina, ...resto } = useConsultaPaginada(buscarTodasAsMovimentacoes, consulta);
  return { ...resto, movimentacoes: pagina };
}

/**
 * Totais do período somados no banco (GET /financial/summary), com tipo e categoria opcionais.
 * resumo: ResumoFinanceiroResponse, ou null enquanto carrega.
 */
export function useResumoFinanceiro({ de, ate, tipo = '', categoria = '' }) {
  const consulta = useMemo(() => ({ dataInicio: de, dataFim: ate, tipo, categoriaId: categoria }), [de, ate, tipo, categoria]);
  const { pagina, ...resto } = useConsultaPaginada(buscarResumo, consulta);
  return { ...resto, resumo: pagina };
}

/** Receitas e despesas por dia ou por mês (GET /financial/summary/series). agrupamento: 'DIA' | 'MES'. pontos: null enquanto carrega. */
export function useSerieFinanceira({ de, ate, agrupamento }) {
  const consulta = useMemo(() => ({ dataInicio: de, dataFim: ate, agrupamento }), [de, ate, agrupamento]);
  const { pagina, ...resto } = useConsultaPaginada(buscarSerie, consulta);
  return { ...resto, pontos: pagina };
}

/** Total e quantidade por categoria (GET /financial/summary/categories), com tipo opcional. linhas: null enquanto carrega. */
export function useTotaisPorCategoria({ de, ate, tipo = '' }) {
  const consulta = useMemo(() => ({ dataInicio: de, dataFim: ate, tipo }), [de, ate, tipo]);
  const { pagina, ...resto } = useConsultaPaginada(buscarTotaisPorCategoria, consulta);
  return { ...resto, linhas: pagina };
}
