import { PERFIS } from '../constants/perfis';
import { SITUACOES_USUARIO, TAMANHO_PAGINA_USUARIOS } from '../constants/usuarios';

/**
 * Estado da lista de usuários na URL, para o F5 e o "voltar" não perderem filtros:
 *   ?busca=ana&perfil=PASTOR&situacao=inativos&pagina=2
 * Página contada a partir de 1 na URL e de 0 no app. Valores inválidos voltam ao padrão
 * (ex.: ?perfil=LIDER some) em vez de gerar 400 no backend. A ordem é a do backend (nome, id).
 */
export const PARAMETROS_URL_USUARIOS = Object.freeze({ BUSCA: 'busca', PERFIL: 'perfil', SITUACAO: 'situacao', PAGINA: 'pagina' });

export const CONSULTA_PADRAO_USUARIOS = Object.freeze({ nome: '', perfil: '', situacao: '', pagina: 0 });

function lerPagina(texto) {
  const numero = Number(texto);
  return Number.isInteger(numero) && numero >= 1 ? numero - 1 : 0;
}

/** URLSearchParams → { nome, perfil, situacao, pagina }. */
export function lerConsultaUsuarios(parametros) {
  const perfil = parametros.get(PARAMETROS_URL_USUARIOS.PERFIL) ?? '';
  const situacao = parametros.get(PARAMETROS_URL_USUARIOS.SITUACAO) ?? '';
  return {
    nome: (parametros.get(PARAMETROS_URL_USUARIOS.BUSCA) ?? '').trim(),
    perfil: Object.values(PERFIS).includes(perfil) ? perfil : '',
    situacao: Object.values(SITUACOES_USUARIO).includes(situacao) ? situacao : '',
    pagina: lerPagina(parametros.get(PARAMETROS_URL_USUARIOS.PAGINA)),
  };
}

/** Consulta → parâmetros da URL, sem os valores padrão. */
export function parametrosDaConsultaUsuarios({ nome, perfil, situacao, pagina }) {
  const parametros = {};
  if (nome?.trim()) parametros[PARAMETROS_URL_USUARIOS.BUSCA] = nome.trim();
  if (perfil) parametros[PARAMETROS_URL_USUARIOS.PERFIL] = perfil;
  if (situacao) parametros[PARAMETROS_URL_USUARIOS.SITUACAO] = situacao;
  if (pagina > 0) parametros[PARAMETROS_URL_USUARIOS.PAGINA] = String(pagina + 1);
  return parametros;
}

/** Consulta da tela → filtros do GET /users (situação vira ativo=true|false; vazia não filtra). */
export function filtrosDoServicoUsuarios({ nome, perfil, situacao, pagina }) {
  const ativo = situacao === SITUACOES_USUARIO.ATIVOS ? true : situacao === SITUACOES_USUARIO.INATIVOS ? false : undefined;
  return { nome, perfil, ativo, pagina, tamanho: TAMANHO_PAGINA_USUARIOS };
}

export function temFiltroUsuarios({ nome, perfil, situacao }) {
  return Boolean(nome || perfil || situacao);
}
