import { isTipoMovimentacaoValido } from '../constants/financeiro';
import { limitesDoMes, mesDaData, somarMeses } from '../utils/calendario';
import { formatarData, formatarMesAno, isDataIsoValida } from '../utils/datas';

/**
 * Estado das telas do Financeiro na URL, para o F5, o "voltar" e a troca de aba não perderem nada:
 *   /financeiro?de=2026-09-01&ate=2026-09-30&tipo=RECEITA&categoria=<uuid>&pagina=2
 *   /financeiro/fluxo-de-caixa?de=…&ate=…   e   /financeiro/relatorio?de=…&ate=…
 * O período padrão é o mês atual no fuso da igreja (hoje vem de agoraDoServidor, como em Eventos).
 * A página é contada a partir de 1 na URL e de 0 no app. Valores inválidos voltam ao padrão.
 */
export const PARAMETROS_URL_FINANCEIRO = Object.freeze({
  DE: 'de',
  ATE: 'ate',
  TIPO: 'tipo',
  CATEGORIA: 'categoria',
  PAGINA: 'pagina',
});

const P = PARAMETROS_URL_FINANCEIRO;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Período de um mês "AAAA-MM": { de, ate } do primeiro ao último dia. */
export function periodoDoMes(mes) {
  const { inicio, fim } = limitesDoMes(mes);
  return { de: inicio, ate: fim };
}

/** Mês atual (no fuso da igreja) como período. hoje: "AAAA-MM-DD". */
export function periodoPadrao(hoje) {
  return periodoDoMes(mesDaData(hoje));
}

/** Os últimos `meses` meses inteiros, contando o atual: em 15/10/2026 com 6 → 01/05/2026 a 31/10/2026. */
export function periodoDosUltimosMeses(hoje, meses) {
  const atual = mesDaData(hoje);
  return { de: periodoDoMes(somarMeses(atual, 1 - meses)).de, ate: periodoDoMes(atual).ate };
}

/** O período é exatamente um mês inteiro? Devolve o mês ("AAAA-MM") ou null. */
export function mesDoPeriodo({ de, ate }) {
  if (!isDataIsoValida(de)) return null;
  const { de: inicio, ate: fim } = periodoDoMes(mesDaData(de));
  return de === inicio && ate === fim ? mesDaData(de) : null;
}

/** Mês anterior/seguinte ao início do período, como período inteiro. */
export function periodoDoMesVizinho({ de }, quantidade) {
  return periodoDoMes(somarMeses(mesDaData(de), quantidade));
}

function lerPagina(texto) {
  const numero = Number(texto);
  return Number.isInteger(numero) && numero >= 1 ? numero - 1 : 0;
}

/** URLSearchParams → { de, ate, tipo, categoria, pagina }. Período incompleto ou invertido → mês atual. */
export function lerConsultaFinanceiro(parametros, { hoje }) {
  const de = parametros.get(P.DE);
  const ate = parametros.get(P.ATE);
  const periodo = isDataIsoValida(de) && isDataIsoValida(ate) && de <= ate ? { de, ate } : periodoPadrao(hoje);
  const tipo = parametros.get(P.TIPO);
  const categoria = parametros.get(P.CATEGORIA);
  return {
    ...periodo,
    tipo: isTipoMovimentacaoValido(tipo) ? tipo : '',
    categoria: UUID.test(categoria ?? '') ? categoria : '',
    pagina: lerPagina(parametros.get(P.PAGINA)),
  };
}

/** Consulta → parâmetros da URL, sem os valores padrão (URL limpa quando nada foi escolhido). */
export function parametrosDaConsultaFinanceiro({ de, ate, tipo, categoria, pagina }, { hoje }) {
  const parametros = {};
  const padrao = periodoPadrao(hoje);
  if (de && ate && (de !== padrao.de || ate !== padrao.ate)) {
    parametros[P.DE] = de;
    parametros[P.ATE] = ate;
  }
  if (tipo) parametros[P.TIPO] = tipo;
  if (categoria) parametros[P.CATEGORIA] = categoria;
  if (pagina > 0) parametros[P.PAGINA] = String(pagina + 1);
  return parametros;
}

/** Só o período, para levar de uma aba a outra (tipo, categoria e página são da lista). */
export function parametrosDoPeriodo({ de, ate }, { hoje }) {
  return parametrosDaConsultaFinanceiro({ de, ate, tipo: '', categoria: '', pagina: 0 }, { hoje });
}

export function temFiltroDeLista({ tipo, categoria }) {
  return Boolean(tipo || categoria);
}

/** Título do período: mês inteiro → "outubro de 2026"; senão "01/10/2026 a 15/10/2026" (um dia só → "05/10/2026"). */
export function descreverPeriodo({ de, ate }) {
  const mes = mesDoPeriodo({ de, ate });
  if (mes) return formatarMesAno(mes);
  return de === ate ? formatarData(de) : `${formatarData(de)} a ${formatarData(ate)}`;
}
