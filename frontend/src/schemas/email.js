/** Mais estrito que o @Email do Hibernate: exige domínio com ponto. */
const PADRAO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailValido(valor) {
  return PADRAO_EMAIL.test(String(valor ?? '').trim());
}
