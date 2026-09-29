function toBase64Url(object) {
  const bytes = new TextEncoder().encode(JSON.stringify(object));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Token sem assinatura real: existe apenas para o modo simulado.
export function createFakeJwt(claims) {
  const header = toBase64Url({ alg: 'none', typ: 'JWT' });
  return `${header}.${toBase64Url(claims)}.mock-signature`;
}
