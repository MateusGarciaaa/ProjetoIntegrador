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

/** Máscara progressiva para digitação: "05032026" → "05/03/2026" (só dígitos, até 8). */
export function formatarDataDigitada(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '').slice(0, 8);
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)].filter(Boolean).join('/');
}

/** LocalTime "19:00:00" (ou "19:00") → "19:00". Valor inválido → "". */
export function formatarHorario(horario) {
  const partes = PADRAO_HORARIO.exec(String(horario ?? ''));
  return partes ? `${partes[1]}:${partes[2]}` : '';
}

/** "HH:mm" com hora 00–23 e minuto 00–59. */
export function isHorarioValido(valor) {
  const partes = /^(\d{2}):(\d{2})$/.exec(String(valor ?? '').trim());
  return Boolean(partes) && Number(partes[1]) <= 23 && Number(partes[2]) <= 59;
}

/** Máscara progressiva para digitação: "1930" → "19:30" (só dígitos, até 4). */
export function formatarHorarioDigitado(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '').slice(0, 4);
  return digitos.length > 2 ? `${digitos.slice(0, 2)}:${digitos.slice(2)}` : digitos;
}

/** LocalTime → "HH:mm:ss", para comparar horários como texto ("19:00" e "19:00:00" empatam). */
export function horarioComSegundos(horario) {
  const partes = /^(\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(horario ?? ''));
  return partes ? `${partes[1]}:${partes[2]}:${partes[3] ?? '00'}` : '';
}

/**
 * Data e hora de agora num fuso IANA (ex.: "America/Sao_Paulo"), no formato do LocalDate e
 * do LocalTime: { data: "AAAA-MM-DD", horario: "HH:mm:ss" }. Não depende do fuso do navegador.
 */
export function agoraNoFuso(fuso, agora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: fuso,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(agora)
      .map(({ type, value }) => [type, value]),
  );
  return { data: `${partes.year}-${partes.month}-${partes.day}`, horario: `${partes.hour}:${partes.minute}:${partes.second}` };
}

const NOMES_MESES = Object.freeze([
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]);

const NOMES_DIAS_SEMANA = Object.freeze(['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']);

/** "2026-10" → "outubro de 2026". Valor inválido → "". */
export function formatarMesAno(mesIso) {
  const partes = /^(\d{4})-(\d{2})$/.exec(String(mesIso ?? ''));
  const indice = partes ? Number(partes[2]) - 1 : -1;
  return indice >= 0 && indice < 12 ? `${NOMES_MESES[indice]} de ${partes[1]}` : '';
}

/** Dia da semana de uma data ISO, 0 = domingo (calculado em UTC: sem fuso no meio). */
export function diaDaSemana(iso) {
  if (!isDataIsoValida(iso)) return -1;
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

/** "2026-11-05" → "quinta-feira, 05/11/2026". Valor inválido → "". */
export function formatarDataPorExtenso(iso) {
  const indice = diaDaSemana(iso);
  return indice < 0 ? '' : `${NOMES_DIAS_SEMANA[indice]}, ${formatarData(iso)}`;
}

/** LocalDateTime "2026-03-05T19:30:12.123456" → "05/03/2026 19:30". Valor inválido → "". */
export function formatarDataHora(dataHora) {
  const partes = PADRAO_DATA_HORA.exec(String(dataHora ?? ''));
  if (!partes) return '';
  const data = formatarData(partes[1]);
  return data ? `${data} ${formatarHorario(partes[2])}` : '';
}
