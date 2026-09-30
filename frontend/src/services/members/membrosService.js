import { httpClient } from '../http/httpClient';
import { normalizarPagina } from '../http/pagina';

const RECURSO = '/members';

function caminhoDoMembro(id) {
  return `${RECURSO}/${encodeURIComponent(id)}`;
}

/** Recebe e devolve objetos com os nomes de campo do MembroRequest/MembroResponse. */
export const membrosService = {
  async listar({ nome, pagina, tamanho, ordenacao }, { signal } = {}) {
    const params = { page: pagina, size: tamanho, sort: ordenacao };
    if (nome) params.nome = nome;
    const { data } = await httpClient.get(RECURSO, { params, signal });
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
