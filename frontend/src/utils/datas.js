const PADRAO_DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Data de hoje no fuso local, no formato do LocalDate (AAAA-MM-DD). */
export function hojeIso(agora = new Date()) {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function isDataIsoValida(valor) {
  const partes = PADRAO_DATA_ISO.exec(valor ?? '');
  if (!partes) return false;
  const [ano, mes, dia] = partes.slice(1).map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}
