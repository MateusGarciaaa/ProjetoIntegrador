import { lerUsuarioDoToken } from '../../utils/jwt';

/** Folga para não enviar um token que vai vencer no meio do caminho. */
export const MARGEM_EXPIRACAO_MS = 5000;

/**
 * Sessão = { token, expiresAt (ms), usuario: { email, nome, perfil } }.
 * expiresAt é o menor entre "agora + expiresIn" e a claim exp do token,
 * o que protege contra relógio do cliente adiantado ou atrasado.
 */
export function criarSessao({ token, expiresIn } = {}, agoraMs = Date.now()) {
  const usuario = lerUsuarioDoToken(token);
  if (!usuario) return null;

  const limites = [];
  if (Number.isFinite(expiresIn) && expiresIn > 0) limites.push(agoraMs + expiresIn * 1000);
  if (usuario.expiraEmSegundos) limites.push(usuario.expiraEmSegundos * 1000);
  if (limites.length === 0) return null;

  return {
    token,
    expiresAt: Math.min(...limites),
    usuario: { email: usuario.email, nome: usuario.nome, perfil: usuario.perfil },
  };
}

/** Reconstrói a sessão guardada, sempre relendo o token (o que foi salvo não é confiável). */
export function restaurarSessao(salva) {
  if (!salva || typeof salva.token !== 'string' || !Number.isFinite(salva.expiresAt)) return null;
  const usuario = lerUsuarioDoToken(salva.token);
  if (!usuario) return null;

  const expiresAt = usuario.expiraEmSegundos
    ? Math.min(salva.expiresAt, usuario.expiraEmSegundos * 1000)
    : salva.expiresAt;
  return { token: salva.token, expiresAt, usuario: { email: usuario.email, nome: usuario.nome, perfil: usuario.perfil } };
}

export function isSessaoExpirada(sessao, agoraMs = Date.now()) {
  return !sessao || agoraMs + MARGEM_EXPIRACAO_MS >= sessao.expiresAt;
}

export function tempoRestanteMs(sessao, agoraMs = Date.now()) {
  return sessao ? Math.max(0, sessao.expiresAt - MARGEM_EXPIRACAO_MS - agoraMs) : 0;
}
