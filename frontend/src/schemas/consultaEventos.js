import { CAMPOS_ORDENAVEIS_EVENTOS, DESEMPATE_EVENTOS, ORDENACAO_PADRAO_EVENTOS, VISOES_EVENTOS } from '../constants/eventos';
import { isMesValido, mesDaData } from '../utils/calendario';
import { dataBrParaIso, isDataIsoValida } from '../utils/datas';
import { lerSort, ordenacaoParaSort } from '../utils/ordenacao';

/**
 * Estado da tela de eventos na URL, para o F5 e o "voltar" não perderem a visão nem os filtros:
 *   ?visao=lista&de=2026-10-01&ate=2026-10-31&pagina=2&ordem=data,desc
 *   ?mes=2026-11                        (calendário, que é a visão padrão)
 * Os parâmetros de uma visão ficam guardados enquanto a outra está aberta (alternar não perde nada).
 * A página é contada a partir de 1 na URL e de 0 no app. Valores inválidos voltam ao padrão.
 */
export const PARAMETROS_URL_EVENTOS = Object.freeze({
  VISAO: 'visao',
  MES: 'mes',
  DE: 'de',
  ATE: 'ate',
  PAGINA: 'pagina',
  ORDEM: 'ordem',
});

const P = PARAMETROS_URL_EVENTOS;

function lerPagina(texto) {
  const numero = Number(texto);
  return Number.isInteger(numero) && numero >= 1 ? numero - 1 : 0;
}

function lerOrdenacao(texto) {
  const ordenacao = lerSort(texto);
  return ordenacao && CAMPOS_ORDENAVEIS_EVENTOS.includes(ordenacao.campo) ? ordenacao : ORDENACAO_PADRAO_EVENTOS;
}

/**
 * O backend só filtra com os dois limites (um só é ignorado em silêncio) e não confere a ordem.
 * Por isso o período só vale completo e em ordem; qualquer outra coisa vira "sem período".
 */
function lerPeriodo(de, ate) {
  if (isDataIsoValida(de) && isDataIsoValida(ate) && de <= ate) return { de, ate };
  return { de: '', ate: '' };
}

/** URLSearchParams → { visao, mes, de, ate, pagina, campo, direcao }. hoje (ISO) define o mês padrão. */
export function lerConsultaEventos(parametros, { hoje }) {
  const visao = parametros.get(P.VISAO) === VISOES_EVENTOS.LISTA ? VISOES_EVENTOS.LISTA : VISOES_EVENTOS.CALENDARIO;
  const mes = parametros.get(P.MES);
  const { campo, direcao } = lerOrdenacao(parametros.get(P.ORDEM));
  return {
    visao,
    mes: isMesValido(mes) ? mes : mesDaData(hoje),
    ...lerPeriodo(parametros.get(P.DE), parametros.get(P.ATE)),
    pagina: lerPagina(parametros.get(P.PAGINA)),
    campo,
    direcao,
  };
}

/** Consulta → parâmetros da URL, sem os valores padrão (URL limpa quando nada foi escolhido). */
export function parametrosDaConsultaEventos({ visao, mes, de, ate, pagina, campo, direcao }, { hoje }) {
  const parametros = {};
  if (visao === VISOES_EVENTOS.LISTA) parametros[P.VISAO] = visao;
  if (mes && mes !== mesDaData(hoje)) parametros[P.MES] = mes;
  if (de && ate) {
    parametros[P.DE] = de;
    parametros[P.ATE] = ate;
  }
  if (pagina > 0) parametros[P.PAGINA] = String(pagina + 1);
  const padrao = ORDENACAO_PADRAO_EVENTOS;
  if (campo !== padrao.campo || direcao !== padrao.direcao) parametros[P.ORDEM] = ordenacaoParaSort({ campo, direcao });
  return parametros;
}

export function temPeriodo({ de, ate }) {
  return Boolean(de && ate);
}

/**
 * sort enviado ao backend: o critério escolhido e os desempates que ainda não estão nele.
 * Ordenando por data, o horário acompanha a direção (data desc → o mais tarde do dia primeiro).
 */
export function criteriosOrdenacaoEventos({ campo, direcao }) {
  const principal = campo === 'data' ? [`data,${direcao}`, `horario,${direcao}`] : [ordenacaoParaSort({ campo, direcao })];
  const usados = principal.map((criterio) => criterio.split(',')[0]);
  return [...principal, ...DESEMPATE_EVENTOS.filter((criterio) => !usados.includes(criterio.split(',')[0]))];
}

/**
 * Período digitado no filtro (DD/MM/AAAA) → { periodo: { de, ate } em ISO } ou { erros }.
 * As duas datas são exigidas porque o backend ignora um limite sozinho.
 */
export function validarPeriodo({ de, ate }) {
  const textoDe = de.trim();
  const textoAte = ate.trim();
  if (!textoDe && !textoAte) return { periodo: { de: '', ate: '' }, erros: {} };

  const erros = {};
  const isoDe = dataBrParaIso(textoDe);
  const isoAte = dataBrParaIso(textoAte);
  if (!textoDe) erros.de = 'Informe a data inicial (o filtro precisa das duas datas).';
  else if (!isoDe) erros.de = 'Data inválida. Use DD/MM/AAAA.';
  if (!textoAte) erros.ate = 'Informe a data final (o filtro precisa das duas datas).';
  else if (!isoAte) erros.ate = 'Data inválida. Use DD/MM/AAAA.';
  if (isoDe && isoAte && isoDe > isoAte) erros.ate = 'A data final não pode ser antes da inicial.';

  return Object.keys(erros).length ? { periodo: null, erros } : { periodo: { de: isoDe, ate: isoAte }, erros };
}
