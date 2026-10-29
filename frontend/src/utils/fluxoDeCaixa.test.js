import { describe, expect, it } from 'vitest';
import {
  agrupamentoDaApi,
  agrupamentoDoPeriodo,
  escalaDoGrafico,
  diasNoPeriodo,
  formatarPercentual,
  linhasPorCategoria,
  serieDoFluxoDeCaixa,
  totaisDaLista,
  totaisDoResumo,
} from './fluxoDeCaixa';

const DIZIMOS = { id: 'c1', nome: 'Dízimos', tipo: 'RECEITA' };
const OFERTAS = { id: 'c2', nome: 'Ofertas', tipo: 'RECEITA' };
const ENERGIA = { id: 'c3', nome: 'Água e energia', tipo: 'DESPESA' };

/** Pontos como o GET /financial/summary/series devolve: só os dias com lançamento. */
const PONTOS_POR_DIA = [
  { periodo: '2026-10-02', totalReceitas: 0.3, totalDespesas: 0, saldo: 0.3 },
  { periodo: '2026-10-07', totalReceitas: 812.4, totalDespesas: 0, saldo: 812.4 },
  { periodo: '2026-10-08', totalReceitas: 0, totalDespesas: '628.50', saldo: -628.5 }, // BigDecimal como texto também vale
];

describe('totaisDoResumo', () => {
  it('converte o ResumoFinanceiroResponse para centavos', () => {
    expect(totaisDoResumo({ totalReceitas: 4097.9, totalDespesas: 2328.5, saldo: 1769.4 })).toEqual({
      receitas: 409790,
      despesas: 232850,
      saldo: 176940,
    });
    expect(totaisDoResumo(null)).toBeNull();
  });
});

describe('totaisDaLista', () => {
  const resumo = { totalReceitas: 4097.9, totalDespesas: '2328.50', saldo: 1769.4 };

  it('sem filtro, receitas e despesas do período (do /summary, em centavos)', () => {
    expect(totaisDaLista(resumo)).toEqual([
      { tipo: 'RECEITA', centavos: 409790 },
      { tipo: 'DESPESA', centavos: 232850 },
    ]);
  });

  it('com tipo ou com categoria, só o tipo filtrado (o summary já vem filtrado)', () => {
    expect(totaisDaLista(resumo, { tipo: 'DESPESA' })).toEqual([{ tipo: 'DESPESA', centavos: 232850 }]);
    expect(totaisDaLista(resumo, { tipo: 'RECEITA' })).toEqual([{ tipo: 'RECEITA', centavos: 409790 }]);
    expect(totaisDaLista(resumo, { tipoDaCategoria: 'RECEITA' })).toEqual([{ tipo: 'RECEITA', centavos: 409790 }]);
    expect(totaisDaLista(null)).toEqual([]);
  });
});

describe('agrupamento do período', () => {
  it('conta os dias com os dois limites', () => {
    expect(diasNoPeriodo('2026-10-01', '2026-10-31')).toBe(31);
    expect(diasNoPeriodo('2026-10-01', '2026-10-01')).toBe(1);
    expect(diasNoPeriodo('2026-10-31', '2026-10-01')).toBe(0);
    expect(diasNoPeriodo('', '2026-10-01')).toBe(0);
  });

  it('diário até 62 dias, mensal acima', () => {
    expect(agrupamentoDoPeriodo('2026-10-01', '2026-10-31')).toBe('dia');
    expect(agrupamentoDoPeriodo('2026-10-01', '2026-12-01')).toBe('dia'); // 62 dias
    expect(agrupamentoDoPeriodo('2026-10-01', '2026-12-02')).toBe('mes');
  });

  it('traduz para o enum AgrupamentoSerie', () => {
    expect(agrupamentoDaApi('dia')).toBe('DIA');
    expect(agrupamentoDaApi('mes')).toBe('MES');
  });
});

describe('serieDoFluxoDeCaixa', () => {
  it('por dia: completa os dias sem lançamento com zero', () => {
    const serie = serieDoFluxoDeCaixa(PONTOS_POR_DIA, { de: '2026-10-01', ate: '2026-10-08' });
    expect(serie.map((p) => p.chave)).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
    ]);
    expect(serie[0]).toEqual({ chave: '2026-10-01', receitas: 0, despesas: 0, saldo: 0 });
    expect(serie[1]).toEqual({ chave: '2026-10-02', receitas: 30, despesas: 0, saldo: 30 });
    expect(serie[7]).toEqual({ chave: '2026-10-08', receitas: 0, despesas: 62850, saldo: -62850 });
  });

  it('por mês: o ponto do backend vem no dia 1 e vira a chave "AAAA-MM"', () => {
    const pontos = [{ periodo: '2026-10-01', totalReceitas: 812.7, totalDespesas: 628.5, saldo: 184.2 }];
    expect(serieDoFluxoDeCaixa(pontos, { de: '2026-09-15', ate: '2026-11-01', agrupamento: 'mes' })).toEqual([
      { chave: '2026-09', receitas: 0, despesas: 0, saldo: 0 },
      { chave: '2026-10', receitas: 81270, despesas: 62850, saldo: 18420 },
      { chave: '2026-11', receitas: 0, despesas: 0, saldo: 0 },
    ]);
  });

  it('ignora pontos fora do período; período inválido → série vazia', () => {
    const serie = serieDoFluxoDeCaixa(PONTOS_POR_DIA, { de: '2026-10-05', ate: '2026-10-07' });
    expect(serie.map((p) => p.receitas)).toEqual([0, 0, 81240]);
    expect(serieDoFluxoDeCaixa(PONTOS_POR_DIA, { de: '2026-10-08', ate: '2026-10-01' })).toEqual([]);
  });
});

describe('linhasPorCategoria', () => {
  const TOTAIS = [
    { categoria: OFERTAS, total: 812.6, quantidade: 2 },
    { categoria: ENERGIA, total: '628.50', quantidade: 2 },
    { categoria: DIZIMOS, total: 450.1, quantidade: 2 },
  ];

  it('filtra o tipo, mantém a ordem do backend e calcula a fração do total oficial', () => {
    const receitas = linhasPorCategoria(TOTAIS, 'RECEITA', 126270);
    expect(receitas.map(({ categoria, total, quantidade }) => [categoria.nome, total, quantidade])).toEqual([
      ['Ofertas', 81260, 2],
      ['Dízimos', 45010, 2],
    ]);
    expect(receitas[0].fracao + receitas[1].fracao).toBeCloseTo(1);
    expect(linhasPorCategoria(TOTAIS, 'DESPESA', 62850)).toEqual([{ categoria: ENERGIA, total: 62850, quantidade: 2, fracao: 1 }]);
  });

  it('sem total do tipo, fração zero; sem linhas, lista vazia', () => {
    expect(linhasPorCategoria(TOTAIS, 'DESPESA', 0)[0].fracao).toBe(0);
    expect(linhasPorCategoria([], 'RECEITA', 0)).toEqual([]);
  });
});

describe('formatarPercentual', () => {
  it('formata em pt-BR com até 1 casa', () => {
    expect(formatarPercentual(0.4567)).toBe('45,7%');
    expect(formatarPercentual(1)).toBe('100%');
    expect(formatarPercentual(Number.NaN)).toBe('');
  });
});

describe('escalaDoGrafico', () => {
  it('arredonda o topo do eixo para um valor redondo acima do maior', () => {
    // Maior valor R$ 1.250,00 → passo R$ 500,00, topo R$ 2.000,00.
    expect(escalaDoGrafico(125000)).toEqual({ maximo: 200000, marcas: [0, 50000, 100000, 150000, 200000] });
    expect(escalaDoGrafico(100000).maximo).toBe(100000);
    expect(escalaDoGrafico(48632).maximo).toBeGreaterThanOrEqual(48632);
  });

  it('sem valores, usa R$ 100,00 como topo', () => {
    expect(escalaDoGrafico(0)).toEqual({ maximo: 10000, marcas: [0, 2500, 5000, 7500, 10000] });
  });
});
