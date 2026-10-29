import { httpClient } from '../http/httpClient';
import { montarParametrosPagina, normalizarPagina } from '../http/pagina';

const RECURSO = '/financial';

function caminhoDaMovimentacao(id) {
  return `${RECURSO}/${encodeURIComponent(id)}`;
}

/** Recebe e devolve objetos com os nomes de campo do MovimentacaoFinanceiraRequest/Response. */
export const financeiroService = {
  /**
   * GET /financial: período, tipo e categoriaId, todos opcionais e combinados no servidor. O período
   * só filtra com dataInicio e dataFim juntos (um só seria ignorado em silêncio, então nesse caso
   * nenhum é enviado). Categoria inexistente devolve página vazia, não 404.
   */
  async listar({ dataInicio, dataFim, tipo, categoriaId, pagina, tamanho, ordenacao }, { signal } = {}) {
    const filtros = {
      ...(dataInicio && dataFim && { dataInicio, dataFim }),
      ...(tipo && { tipo }),
      ...(categoriaId && { categoriaId }),
    };
    const params = montarParametrosPagina({ pagina, tamanho, ordenacao, filtros });
    const { data } = await httpClient.get(RECURSO, { params, signal });
    return normalizarPagina(data);
  },

  async buscarPorId(id, { signal } = {}) {
    const { data } = await httpClient.get(caminhoDaMovimentacao(id), { signal });
    return data;
  },

  /** GET /financial/summary: os dois limites são obrigatórios. { dataInicio, dataFim, totalReceitas, totalDespesas, saldo } */
  async resumo({ dataInicio, dataFim }, { signal } = {}) {
    const { data } = await httpClient.get(`${RECURSO}/summary`, { params: { dataInicio, dataFim }, signal });
    return data;
  },

  /** valor: número com até 2 casas, sempre positivo (RN06/RN07: o tipo diz se entra ou sai). */
  async cadastrar(movimentacao) {
    const { data } = await httpClient.post(RECURSO, movimentacao);
    return data;
  },

  async atualizar(id, movimentacao) {
    const { data } = await httpClient.put(caminhoDaMovimentacao(id), movimentacao);
    return data;
  },

  async excluir(id) {
    await httpClient.delete(caminhoDaMovimentacao(id));
  },
};
