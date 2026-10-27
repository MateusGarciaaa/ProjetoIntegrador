import { TAMANHO_MAXIMO_BUSCA_MEMBROS } from '../../constants/membros';
import { httpClient } from '../http/httpClient';
import { montarParametrosPagina, normalizarPagina } from '../http/pagina';

const RECURSO = '/members';
const RECURSO_BUSCA = `${RECURSO}/lookup`;

function caminhoDoMembro(id) {
  return `${RECURSO}/${encodeURIComponent(id)}`;
}

/** Recebe e devolve objetos com os nomes de campo do MembroRequest/MembroResponse. */
export const membrosService = {
  async listar({ nome, pagina, tamanho, ordenacao }, { signal } = {}) {
    const params = montarParametrosPagina({ pagina, tamanho, ordenacao, filtros: { nome } });
    const { data } = await httpClient.get(RECURSO, { params, signal });
    return normalizarPagina(data);
  },

  /**
   * GET /members/lookup: só { id, nome, status }, ordenado por nome, até 20 por página.
   * Para seletores de outros módulos (ex.: membro de um lançamento financeiro).
   */
  async buscarResumo({ nome, status, pagina = 0, tamanho = TAMANHO_MAXIMO_BUSCA_MEMBROS } = {}, { signal } = {}) {
    const params = montarParametrosPagina({ pagina, tamanho, filtros: { nome, status } });
    const { data } = await httpClient.get(RECURSO_BUSCA, { params, signal });
    return normalizarPagina(data);
  },

  async cadastrar(membro) {
    const { data } = await httpClient.post(RECURSO, membro);
    return data;
  },

  async atualizar(id, membro) {
    const { data } = await httpClient.put(caminhoDoMembro(id), membro);
    return data;
  },

  async excluir(id) {
    await httpClient.delete(caminhoDoMembro(id));
  },
};
