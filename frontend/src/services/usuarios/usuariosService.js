import { httpClient } from '../http/httpClient';
import { montarParametrosPagina, normalizarPagina } from '../http/pagina';

const RECURSO = '/users';

function caminhoDoUsuario(id) {
  return `${RECURSO}/${encodeURIComponent(id)}`;
}

/**
 * Gestão de usuários (UsuarioController, só ADMINISTRADOR). Recebe e devolve objetos com os nomes
 * de campo do UsuarioCadastroRequest/UsuarioAtualizacaoRequest/UsuarioResponse.
 */
export const usuariosService = {
  /** Filtros opcionais nome, perfil e ativo (true/false); o backend ordena por nome e id. */
  async listar({ nome, perfil, ativo, pagina, tamanho }, { signal } = {}) {
    const params = montarParametrosPagina({ pagina, tamanho, filtros: { nome, perfil, ativo } });
    const { data } = await httpClient.get(RECURSO, { params, signal });
    return normalizarPagina(data);
  },

  async buscarPorId(id, { signal } = {}) {
    const { data } = await httpClient.get(caminhoDoUsuario(id), { signal });
    return data;
  },

  /** Sem senha: o backend envia o convite. Responde 201 com convitePendente = true. */
  async cadastrar(usuario) {
    const { data } = await httpClient.post(RECURSO, usuario);
    return data;
  },

  /** Só nome e perfil; o e-mail (login) não muda. */
  async atualizar(id, usuario) {
    const { data } = await httpClient.put(caminhoDoUsuario(id), usuario);
    return data;
  },

  async desativar(id) {
    const { data } = await httpClient.post(`${caminhoDoUsuario(id)}/deactivate`);
    return data;
  },

  async ativar(id) {
    const { data } = await httpClient.post(`${caminhoDoUsuario(id)}/activate`);
    return data;
  },

  /** Novo link de convite (o anterior deixa de valer); responde 204. */
  async reenviarConvite(id) {
    await httpClient.post(`${caminhoDoUsuario(id)}/invite`);
  },
};
