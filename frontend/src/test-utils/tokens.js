/** Monta um JWT com o payload informado (assinatura irrelevante: o cliente não a valida). */
export function tokenCom(payload) {
  const base64Url = (objeto) => Buffer.from(JSON.stringify(objeto)).toString('base64url');
  return `${base64Url({ alg: 'HS384' })}.${base64Url(payload)}.assinatura`;
}
