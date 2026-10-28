import { httpClient } from '../http/httpClient';
import { montarParametrosPagina, normalizarPagina } from '../http/pagina';

const RECURSO = '/events';

function caminhoDoEvento(id) {
  return `${RECURSO}/${encodeURIComponent(id)}`;
}

/** Recebe e devolve objetos com os nomes de campo do EventoRequest/EventoResponse. */
export const eventosService = {
  /**
   * Período opcional (dataInicio e dataFim em AAAA-MM-DD). O backend só filtra quando os dois
   * vêm; um só seria ignorado em silêncio, então nesse caso nenhum é enviado.
   * ordenacao: "campo,dir" ou lista com os critérios de desempate.
   */
  async listar({ dataInicio, dataFim, pagina, tamanho, ordenacao }, { signal } = {}) {
    const filtros = dataInicio && dataFim ? { dataInicio, dataFim } : {};
    const params = montarParametrosPagina({ pagina, tamanho, ordenacao, filtros });
    const { data } = await httpClient.get(RECURSO, { params, signal });
    return normalizarPagina(data);
  },

  async buscarPorId(id, { signal } = {}) {
    const { data } = await httpClient.get(caminhoDoEvento(id), { signal });
    return data;
  },

  async cadastrar(evento) {
    const { data } = await httpClient.post(RECURSO, evento);
    return data;
  },

  async atualizar(id, evento) {
    const { data } = await httpClient.put(caminhoDoEvento(id), evento);
    return data;
  },

  async excluir(id) {
    await httpClient.delete(caminhoDoEvento(id));
  },
};
