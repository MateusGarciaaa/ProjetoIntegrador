import { isSessaoExpirada, restaurarSessao } from './sessao';

const CHAVE = 'churchhub.sessao';

export const MOTIVOS_FIM_SESSAO = Object.freeze({
  EXPIRADA: 'expirada',
  RECUSADA: 'recusada',
  ACESSO_ALTERADO: 'acesso-alterado',
  SENHA_ALTERADA: 'senha-alterada',
});

/**
 * Mensagens exatas do 401 com motivo (SituacaoToken no backend): o token era autêntico, mas o
 * perfil ou a senha mudaram depois da emissão. Provisório como o errosServidor.js: depende do texto.
 */
const MOTIVO_POR_MENSAGEM = Object.freeze({
  'Seu acesso foi alterado. Entre novamente.': MOTIVOS_FIM_SESSAO.ACESSO_ALTERADO,
  'Sua senha foi alterada. Entre novamente.': MOTIVOS_FIM_SESSAO.SENHA_ALTERADA,
});

/** Motivo do encerramento a partir da mensagem do 401; qualquer outra é "sessão recusada". */
export function motivoDaRecusa(mensagem) {
  return MOTIVO_POR_MENSAGEM[mensagem] ?? MOTIVOS_FIM_SESSAO.RECUSADA;
}

/**
 * sessionStorage: o token some ao fechar o navegador e não é compartilhado entre abas.
 * É um meio-termo; o ideal (cookie httpOnly + refresh token) depende do backend.
 */
function armazenamento() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const ouvintes = new Set();

export function lerSessao() {
  const bruto = armazenamento()?.getItem(CHAVE);
  if (!bruto) return null;

  let sessao = null;
  try {
    sessao = restaurarSessao(JSON.parse(bruto));
  } catch {
    sessao = null;
  }
  if (!sessao || isSessaoExpirada(sessao)) {
    limparSessao();
    return null;
  }
  return sessao;
}

export function salvarSessao(sessao) {
  armazenamento()?.setItem(CHAVE, JSON.stringify({ token: sessao.token, expiresAt: sessao.expiresAt }));
}

export function limparSessao() {
  armazenamento()?.removeItem(CHAVE);
}

/** Canal entre a camada HTTP e o AuthProvider, sem que um importe o outro. */
export function aoEncerrarSessao(ouvinte) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function encerrarSessao(motivo) {
  limparSessao();
  ouvintes.forEach((ouvinte) => ouvinte(motivo));
}
