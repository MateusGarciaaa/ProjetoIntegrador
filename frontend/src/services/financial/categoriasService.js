import { httpClient } from '../http/httpClient';

const RECURSO = '/financial-categories';

/** CategoriaFinanceiraResponse: { id, nome, tipo }. Não há edição nem exclusão de categoria no backend. */
export const categoriasService = {
  /** Lista inteira (não paginada) e sem ordem garantida; tipo (RECEITA/DESPESA) opcional. */
  async listar({ tipo } = {}, { signal } = {}) {
    const { data } = await httpClient.get(RECURSO, { params: tipo ? { tipo } : {}, signal });
    return data;
  },

  /** 409 se já existe uma categoria com o mesmo nome (comparação exata) para o mesmo tipo. */
  async cadastrar(categoria) {
    const { data } = await httpClient.post(RECURSO, categoria);
    return data;
  },
};
