const ASSINATURA_FALSA = 'assinatura-do-modo-demonstracao';

function textoParaBase64Url(texto) {
  const bytes = new TextEncoder().encode(texto);
  const binario = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlParaTexto(segmento) {
  const base64 = segmento.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)));
}

const ASSINATURA = textoParaBase64Url(ASSINATURA_FALSA);

/** Mesmas claims do JwtService: sub, perfil ("ROLE_X"), iat e exp (em segundos). */
export function emitirTokenFalso({ email, perfil, agoraMs, validadeSegundos }) {
  const iat = Math.floor(agoraMs / 1000);
  const cabecalho = textoParaBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = textoParaBase64Url(JSON.stringify({ sub: email, perfil: `ROLE_${perfil}`, iat, exp: iat + validadeSegundos }));
  return `${cabecalho}.${payload}.${ASSINATURA}`;
}

/** Devolve o payload se o token for "assinado" pelo mock e não estiver vencido. */
export function verificarTokenFalso(token, agoraMs) {
  const partes = String(token ?? '').split('.');
  if (partes.length !== 3 || partes[2] !== ASSINATURA) return null;
  try {
    const payload = JSON.parse(base64UrlParaTexto(partes[1]));
    return Number.isFinite(payload.exp) && payload.exp * 1000 > agoraMs ? payload : null;
  } catch {
    return null;
  }
}
