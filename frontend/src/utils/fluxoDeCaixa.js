import { AGRUPAMENTOS, LIMITE_DIAS_GRAFICO_DIARIO, TIPOS_MOVIMENTACAO } from '../constants/financeiro';
import { mesDaData, somarDias, somarMeses } from './calendario';
import { isDataIsoValida } from './datas';
import { paraCentavos } from './moeda';

/*
 * Cálculos do Financeiro sobre a lista de movimentações (MovimentacaoFinanceiraResponse),
 * sempre em centavos inteiros (utils/moeda.js), nunca somando floats. O backend filtra e pagina a
 * lista, mas não tem série por dia/mês nem totais por categoria: isso sai daqui.
 */

const MS_POR_DIA = 86_400_000;

const FORMATO_PERCENTUAL = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

function centavosDe(movimentacao) {
  return paraCentavos(movimentacao.valor) ?? 0;
}

/** { receitas, despesas, saldo } em centavos. Saldo = receitas − despesas (o valor é sempre positivo; o tipo dá o sentido). */
export function totaisDasMovimentacoes(movimentacoes) {
  let receitas = 0;
  let despesas = 0;
  movimentacoes.forEach((m) => {
    if (m.tipo === TIPOS_MOVIMENTACAO.RECEITA) receitas += centavosDe(m);
    else if (m.tipo === TIPOS_MOVIMENTACAO.DESPESA) despesas += centavosDe(m);
  });
  return { receitas, despesas, saldo: receitas - despesas };
}

/** ResumoFinanceiroResponse (/financial/summary) → { receitas, despesas, saldo } em centavos. */
export function totaisDoResumo(resumo) {
  if (!resumo) return null;
  return {
    receitas: paraCentavos(resumo.totalReceitas) ?? 0,
    despesas: paraCentavos(resumo.totalDespesas) ?? 0,
    saldo: paraCentavos(resumo.saldo) ?? 0,
  };
}

/**
 * Totais que a lista filtrada pode mostrar, vindos do /summary do período: com filtro de tipo, só o
 * daquele tipo; com filtro de categoria, nenhum (o summary não separa por categoria).
 * → [{ tipo, centavos }]
 */
export function totaisDaLista(resumo, { tipo = '', categoria = '' } = {}) {
  const totais = totaisDoResumo(resumo);
  if (!totais || categoria) return [];
  const linhas = [];
  if (tipo !== TIPOS_MOVIMENTACAO.DESPESA) linhas.push({ tipo: TIPOS_MOVIMENTACAO.RECEITA, centavos: totais.receitas });
  if (tipo !== TIPOS_MOVIMENTACAO.RECEITA) linhas.push({ tipo: TIPOS_MOVIMENTACAO.DESPESA, centavos: totais.despesas });
  return linhas;
}

function paraUtc(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

/** Dias do período, contando os dois limites: 01/10 a 31/10 → 31. */
export function diasNoPeriodo(de, ate) {
  if (!isDataIsoValida(de) || !isDataIsoValida(ate) || de > ate) return 0;
  return Math.round((paraUtc(ate) - paraUtc(de)) / MS_POR_DIA) + 1;
}

/** Barras por dia em períodos curtos (até ~2 meses); por mês nos maiores. */
export function agrupamentoDoPeriodo(de, ate) {
  return diasNoPeriodo(de, ate) <= LIMITE_DIAS_GRAFICO_DIARIO ? AGRUPAMENTOS.DIA : AGRUPAMENTOS.MES;
}

function chavesDoPeriodo(de, ate, agrupamento) {
  const chaves = [];
  if (agrupamento === AGRUPAMENTOS.MES) {
    for (let mes = mesDaData(de); mes <= mesDaData(ate); mes = somarMeses(mes, 1)) chaves.push(mes);
  } else {
    for (let dia = de; dia <= ate; dia = somarDias(dia, 1)) chaves.push(dia);
  }
  return chaves;
}

/**
 * Série do fluxo de caixa: um ponto por dia ("AAAA-MM-DD") ou por mês ("AAAA-MM") do período,
 * inclusive os vazios (o eixo não pula dias), com { chave, receitas, despesas, saldo } em centavos.
 * Movimentações fora do período são ignoradas.
 */
export function serieDoFluxoDeCaixa(movimentacoes, { de, ate, agrupamento = agrupamentoDoPeriodo(de, ate) }) {
  if (diasNoPeriodo(de, ate) === 0) return [];
  const pontos = new Map(chavesDoPeriodo(de, ate, agrupamento).map((chave) => [chave, { chave, receitas: 0, despesas: 0, saldo: 0 }]));

  movimentacoes.forEach((m) => {
    if (!isDataIsoValida(m.data) || m.data < de || m.data > ate) return;
    const ponto = pontos.get(agrupamento === AGRUPAMENTOS.MES ? mesDaData(m.data) : m.data);
    if (m.tipo === TIPOS_MOVIMENTACAO.RECEITA) ponto.receitas += centavosDe(m);
    else if (m.tipo === TIPOS_MOVIMENTACAO.DESPESA) ponto.despesas += centavosDe(m);
    ponto.saldo = ponto.receitas - ponto.despesas;
  });

  return [...pontos.values()];
}

/**
 * Total de cada categoria de um tipo, da maior para a menor (empate: nome), com a fração do total
 * do tipo (0 a 1). [{ categoria: { id, nome }, total (centavos), quantidade, fracao }]
 */
export function totaisPorCategoria(movimentacoes, tipo) {
  const grupos = new Map();
  movimentacoes
    .filter((m) => m.tipo === tipo)
    .forEach((m) => {
      const id = m.categoria?.id ?? '';
      const grupo = grupos.get(id) ?? { categoria: { id, nome: m.categoria?.nome ?? 'Sem categoria' }, total: 0, quantidade: 0 };
      grupo.total += centavosDe(m);
      grupo.quantidade += 1;
      grupos.set(id, grupo);
    });

  const totalDoTipo = [...grupos.values()].reduce((soma, grupo) => soma + grupo.total, 0);
  return [...grupos.values()]
    .map((grupo) => ({ ...grupo, fracao: totalDoTipo > 0 ? grupo.total / totalDoTipo : 0 }))
    .sort((a, b) => b.total - a.total || a.categoria.nome.localeCompare(b.categoria.nome, 'pt-BR'));
}

/** 0.4567 → "45,7%". */
export function formatarPercentual(fracao) {
  return Number.isFinite(fracao) ? FORMATO_PERCENTUAL.format(fracao) : '';
}

/** Os totais da lista conferem com os do /summary? (Se a lista veio incompleta, não conferem.) */
export function totaisConferem(calculados, oficiais) {
  if (!calculados || !oficiais) return true;
  return calculados.receitas === oficiais.receitas && calculados.despesas === oficiais.despesas;
}

/**
 * Escala do eixo do gráfico: topo "redondo" (1, 2, 2,5 ou 5 × 10^n reais) acima do maior valor, com
 * `divisoes` marcas iguais a partir de zero. Tudo em centavos. Sem valores → topo de R$ 100,00.
 */
export function escalaDoGrafico(maiorCentavos, { divisoes = 4 } = {}) {
  const maior = Math.max(0, maiorCentavos || 0);
  if (maior === 0) return { maximo: 10000, marcas: Array.from({ length: divisoes + 1 }, (_, i) => (10000 / divisoes) * i) };
  const passoBruto = maior / divisoes;
  const potencia = 10 ** Math.floor(Math.log10(passoBruto));
  const passo = [1, 2, 2.5, 5, 10].map((fator) => fator * potencia).find((candidato) => candidato >= passoBruto);
  const passoInteiro = Math.max(1, Math.round(passo));
  return { maximo: passoInteiro * divisoes, marcas: Array.from({ length: divisoes + 1 }, (_, i) => passoInteiro * i) };
}
