import { AGRUPAMENTOS, LIMITE_DIAS_GRAFICO_DIARIO, TIPOS_MOVIMENTACAO } from '../constants/financeiro';
import { mesDaData, somarDias, somarMeses } from './calendario';
import { isDataIsoValida } from './datas';
import { paraCentavos } from './moeda';

/*
 * Apresentação das agregações do Financeiro, que o backend soma no banco (GET /financial/summary,
 * /summary/series e /summary/categories): aqui só se converte para centavos inteiros
 * (utils/moeda.js), se completa o eixo do gráfico e se calcula a fração de cada categoria.
 * Nenhum total é somado no navegador a partir da lista de lançamentos.
 */

const MS_POR_DIA = 86_400_000;

const FORMATO_PERCENTUAL = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

function centavos(valor) {
  return paraCentavos(valor) ?? 0;
}

/** ResumoFinanceiroResponse (/financial/summary) → { receitas, despesas, saldo } em centavos. */
export function totaisDoResumo(resumo) {
  if (!resumo) return null;
  return {
    receitas: centavos(resumo.totalReceitas),
    despesas: centavos(resumo.totalDespesas),
    saldo: centavos(resumo.saldo),
  };
}

/**
 * Totais que a lista filtrada mostra, vindos do /summary com os mesmos filtros: os dois tipos sem
 * filtro; só o do tipo escolhido (ou o da categoria escolhida, que tem um tipo só).
 * → [{ tipo, centavos }]
 */
export function totaisDaLista(resumo, { tipo = '', tipoDaCategoria = '' } = {}) {
  const totais = totaisDoResumo(resumo);
  if (!totais) return [];
  const tipoUnico = tipo || tipoDaCategoria;
  const linhas = [];
  if (tipoUnico !== TIPOS_MOVIMENTACAO.DESPESA) linhas.push({ tipo: TIPOS_MOVIMENTACAO.RECEITA, centavos: totais.receitas });
  if (tipoUnico !== TIPOS_MOVIMENTACAO.RECEITA) linhas.push({ tipo: TIPOS_MOVIMENTACAO.DESPESA, centavos: totais.despesas });
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

/** 'dia' | 'mes' → enum AgrupamentoSerie do backend ('DIA' | 'MES'). */
export function agrupamentoDaApi(agrupamento) {
  return agrupamento === AGRUPAMENTOS.MES ? 'MES' : 'DIA';
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
 * Série do fluxo de caixa a partir dos pontos do /summary/series (só os dias/meses com lançamento):
 * um ponto por dia ("AAAA-MM-DD") ou por mês ("AAAA-MM") do período, inclusive os vazios (o eixo
 * não pula dias), com { chave, receitas, despesas, saldo } em centavos. Pontos fora do período são ignorados.
 */
export function serieDoFluxoDeCaixa(pontos, { de, ate, agrupamento = agrupamentoDoPeriodo(de, ate) }) {
  if (diasNoPeriodo(de, ate) === 0) return [];
  const serie = new Map(chavesDoPeriodo(de, ate, agrupamento).map((chave) => [chave, { chave, receitas: 0, despesas: 0, saldo: 0 }]));
  pontos.forEach((ponto) => {
    const chave = agrupamento === AGRUPAMENTOS.MES ? mesDaData(ponto.periodo) : ponto.periodo;
    if (!serie.has(chave)) return;
    serie.set(chave, { chave, receitas: centavos(ponto.totalReceitas), despesas: centavos(ponto.totalDespesas), saldo: centavos(ponto.saldo) });
  });
  return [...serie.values()];
}

/**
 * Linhas por categoria de um tipo (do /summary/categories, já na ordem do backend: maior total
 * primeiro), com a fração do total oficial do tipo (0 a 1).
 *   → [{ categoria: { id, nome, tipo }, total (centavos), quantidade, fracao }]
 */
export function linhasPorCategoria(totaisPorCategoria, tipo, totalDoTipo) {
  return totaisPorCategoria
    .filter((linha) => linha.categoria.tipo === tipo)
    .map((linha) => {
      const total = centavos(linha.total);
      return { categoria: linha.categoria, total, quantidade: linha.quantidade, fracao: totalDoTipo > 0 ? total / totalDoTipo : 0 };
    });
}

/** 0.4567 → "45,7%". */
export function formatarPercentual(fracao) {
  return Number.isFinite(fracao) ? FORMATO_PERCENTUAL.format(fracao) : '';
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
