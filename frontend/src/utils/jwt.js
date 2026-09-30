import { PREFIXO_ROLE } from '../constants/perfis';

function base64UrlParaTexto(segmento) {
  const base64 = segmento.replace(/-/g, '+').replace(/_/g, '/');
  const comPreenchimento = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binario = atob(comPreenchimento);
  const bytes = Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Lê o payload do JWT apenas para exibição e controle de expiração.
 * A assinatura NÃO é validada aqui: quem confia no token é o backend.
 */
export function decodificarPayloadJwt(token) {
  if (typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 3 || !partes[1]) return null;

  try {
    const payload = JSON.parse(base64UrlParaTexto(partes[1]));
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function removerPrefixoRole(perfil) {
  if (typeof perfil !== 'string') return null;
  const texto = perfil.trim();
  const semPrefixo = texto.startsWith(PREFIXO_ROLE) ? texto.slice(PREFIXO_ROLE.length) : texto;
  return semPrefixo || null;
}

/**
 * Claims emitidas pelo JwtService: sub (e-mail), perfil ("ROLE_X"), iat e exp.
 * A claim "nome" não existe hoje; se passar a existir, já é aproveitada.
 */
export function lerUsuarioDoToken(token) {
  const payload = decodificarPayloadJwt(token);
  if (!payload || typeof payload.sub !== 'string' || !payload.sub) return null;

  const nome = typeof payload.nome === 'string' && payload.nome.trim() ? payload.nome.trim() : null;
  return {
    email: payload.sub,
    nome,
    perfil: removerPrefixoRole(payload.perfil),
    expiraEmSegundos: Number.isFinite(payload.exp) ? payload.exp : null,
  };
}
