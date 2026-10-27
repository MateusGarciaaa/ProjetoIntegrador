const PADRAO_DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const PADRAO_DATA_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const PADRAO_HORARIO = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;
/** LocalDateTime do Jackson: "AAAA-MM-DDTHH:mm[:ss[.fração]]", sem fuso. */
const PADRAO_DATA_HORA = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/;

/*
 * As datas do backend (LocalDate, LocalTime, LocalDateTime) não têm fuso. Por isso
 * elas são tratadas como texto e nunca passam por new Date("AAAA-MM-DD"), que as lê
 * como meia-noite UTC e, no Brasil (UTC−3), exibiria o dia anterior.
 */

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

/** "2026-03-05" → "05/03/2026". Valor vazio ou inválido → "". */
export function formatarData(iso) {
  if (!isDataIsoValida(iso)) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** "05/03/2026" → "2026-03-05". Valor inválido → null. */
export function dataBrParaIso(texto) {
  const partes = PADRAO_DATA_BR.exec(String(texto ?? '').trim());
  if (!partes) return null;
  const [, dia, mes, ano] = partes;
  const iso = `${ano}-${mes}-${dia}`;
  return isDataIsoValida(iso) ? iso : null;
}

/** LocalTime "19:00:00" (ou "19:00") → "19:00". Valor inválido → "". */
export function formatarHorario(horario) {
  const partes = PADRAO_HORARIO.exec(String(horario ?? ''));
  return partes ? `${partes[1]}:${partes[2]}` : '';
}

/** LocalDateTime "2026-03-05T19:30:12.123456" → "05/03/2026 19:30". Valor inválido → "". */
export function formatarDataHora(dataHora) {
  const partes = PADRAO_DATA_HORA.exec(String(dataHora ?? ''));
  if (!partes) return '';
  const data = formatarData(partes[1]);
  return data ? `${data} ${formatarHorario(partes[2])}` : '';
}
