export function somenteDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

/** Remove espaços nas pontas e reduz sequências de espaços a um só. */
export function normalizarEspacos(valor) {
  return String(valor ?? '').trim().replace(/\s+/g, ' ');
}

export function vazioParaNull(valor) {
  return valor === '' || valor === undefined || valor === null ? null : valor;
}

export function contarLetras(valor) {
  return (String(valor ?? '').match(/\p{L}/gu) ?? []).length;
}
