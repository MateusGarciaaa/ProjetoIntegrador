import { CAMPOS_ORDENAVEIS_MEMBROS, ORDENACAO_PADRAO_MEMBROS } from '../constants/membros';
import { isStatusValido } from '../constants/statusMembro';
import { lerSort, ordenacaoParaSort } from '../utils/ordenacao';

/**
 * Estado da lista de membros na URL, para o F5 e o "voltar" não perderem filtros:
 *   ?busca=ana&status=ATIVO&pagina=2&ordem=email,desc
 * A página é contada a partir de 1 na URL (como a pessoa lê) e de 0 no app (como o Spring).
 * Valores inválidos digitados na URL voltam ao padrão em vez de gerar 400 no backend.
 */
export const PARAMETROS_URL = Object.freeze({ BUSCA: 'busca', STATUS: 'status', PAGINA: 'pagina', ORDEM: 'ordem' });

export const CONSULTA_PADRAO_MEMBROS = Object.freeze({
  nome: '',
  status: '',
  pagina: 0,
  ...ORDENACAO_PADRAO_MEMBROS,
});

function lerPagina(texto) {
  const numero = Number(texto);
  return Number.isInteger(numero) && numero >= 1 ? numero - 1 : 0;
}

function lerOrdenacao(texto) {
  const ordenacao = lerSort(texto);
  return ordenacao && CAMPOS_ORDENAVEIS_MEMBROS.includes(ordenacao.campo) ? ordenacao : ORDENACAO_PADRAO_MEMBROS;
}

/** URLSearchParams → { nome, status, pagina, campo, direcao }. */
export function lerConsultaMembros(parametros) {
  const status = parametros.get(PARAMETROS_URL.STATUS) ?? '';
  const { campo, direcao } = lerOrdenacao(parametros.get(PARAMETROS_URL.ORDEM));
  return {
    nome: (parametros.get(PARAMETROS_URL.BUSCA) ?? '').trim(),
    status: isStatusValido(status) ? status : '',
    pagina: lerPagina(parametros.get(PARAMETROS_URL.PAGINA)),
    campo,
    direcao,
  };
}

/** Consulta → parâmetros da URL, sem os valores padrão (URL limpa quando nada foi escolhido). */
export function parametrosDaConsulta({ nome, status, pagina, campo, direcao }) {
  const parametros = {};
  if (nome?.trim()) parametros[PARAMETROS_URL.BUSCA] = nome.trim();
  if (status) parametros[PARAMETROS_URL.STATUS] = status;
  if (pagina > 0) parametros[PARAMETROS_URL.PAGINA] = String(pagina + 1);
  const padrao = ORDENACAO_PADRAO_MEMBROS;
  if (campo !== padrao.campo || direcao !== padrao.direcao) {
    parametros[PARAMETROS_URL.ORDEM] = ordenacaoParaSort({ campo, direcao });
  }
  return parametros;
}

/** Algum filtro ativo? (decide entre "nenhum encontrado" e "nenhum cadastrado"). */
export function temFiltro({ nome, status }) {
  return Boolean(nome || status);
}
