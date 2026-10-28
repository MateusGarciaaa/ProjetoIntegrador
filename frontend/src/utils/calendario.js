import { diaDaSemana, isDataIsoValida } from './datas';

/*
 * Aritmética de calendário sobre texto ISO ("AAAA-MM" e "AAAA-MM-DD"). Os cálculos usam
 * Date.UTC só como contador de dias, sempre lido de volta em UTC: o fuso do navegador
 * nunca entra, então um dia não "escorrega" para o vizinho.
 */

const PADRAO_MES = /^(\d{4})-(\d{2})$/;
const DIAS_NA_GRADE = 42; // 6 semanas: cabe qualquer mês, e a altura da grade não pula ao navegar
const MS_POR_DIA = 86_400_000;

function paraIso(utcMs) {
  return new Date(utcMs).toISOString().slice(0, 10);
}

function paraUtc(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

export function isMesValido(mes) {
  const partes = PADRAO_MES.exec(String(mes ?? ''));
  return Boolean(partes) && Number(partes[2]) >= 1 && Number(partes[2]) <= 12;
}

/** "2026-11-05" → "2026-11". */
export function mesDaData(iso) {
  return String(iso).slice(0, 7);
}

/** Soma (ou subtrai) meses: "2026-01" + -1 → "2025-12". */
export function somarMeses(mes, quantidade) {
  const [ano, numero] = mes.split('-').map(Number);
  const total = ano * 12 + (numero - 1) + quantidade;
  return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}`;
}

export function somarDias(iso, quantidade) {
  return paraIso(paraUtc(iso) + quantidade * MS_POR_DIA);
}

/** Primeiro e último dia do mês: "2026-02" → { inicio: "2026-02-01", fim: "2026-02-28" }. */
export function limitesDoMes(mes) {
  const inicio = `${mes}-01`;
  return { inicio, fim: somarDias(`${somarMeses(mes, 1)}-01`, -1) };
}

/**
 * As 42 células da grade mensal (semanas de domingo a sábado), com os dias do mês anterior
 * e do seguinte completando a primeira e a última semana.
 *   [{ data: "AAAA-MM-DD", dia: 5, doMes: true }]
 */
export function gradeDoMes(mes) {
  const { inicio: primeiro } = limitesDoMes(mes);
  const inicioDaGrade = somarDias(primeiro, -diaDaSemana(primeiro));
  return Array.from({ length: DIAS_NA_GRADE }, (_, indice) => {
    const data = somarDias(inicioDaGrade, indice);
    return { data, dia: Number(data.slice(8)), doMes: mesDaData(data) === mes };
  });
}

/** Primeira e última data da grade: é o período pedido ao backend (dataInicio/dataFim). */
export function intervaloDaGrade(mes) {
  const grade = gradeDoMes(mes);
  return { inicio: grade[0].data, fim: grade[grade.length - 1].data };
}

/** Eventos agrupados por data, cada dia na ordem de horário: { "AAAA-MM-DD": [evento, ...] }. */
export function agruparPorData(eventos) {
  const grupos = {};
  eventos.forEach((evento) => {
    if (!isDataIsoValida(evento.data)) return;
    (grupos[evento.data] ??= []).push(evento);
  });
  Object.values(grupos).forEach((lista) => lista.sort((a, b) => String(a.horario).localeCompare(String(b.horario))));
  return grupos;
}
