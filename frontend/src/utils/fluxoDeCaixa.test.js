import { describe, expect, it } from 'vitest';
import {
  agrupamentoDoPeriodo,
  escalaDoGrafico,
  diasNoPeriodo,
  formatarPercentual,
  serieDoFluxoDeCaixa,
  totaisConferem,
  totaisDaLista,
  totaisDasMovimentacoes,
  totaisDoResumo,
  totaisPorCategoria,
} from './fluxoDeCaixa';

const DIZIMOS = { id: 'c1', nome: 'Dízimos', tipo: 'RECEITA' };
const OFERTAS = { id: 'c2', nome: 'Ofertas', tipo: 'RECEITA' };
const ENERGIA = { id: 'c3', nome: 'Água e energia', tipo: 'DESPESA' };

function mov(id, tipo, valor, data, categoria) {
  return { id, tipo, valor, data, categoria, descricao: id, membroId: null, membroNome: null };
}

const MOVIMENTACOES = [
  mov('a', 'RECEITA', 0.1, '2026-10-02', DIZIMOS),
  mov('b', 'RECEITA', 0.2, '2026-10-02', OFERTAS),
  mov('c', 'RECEITA', 812.4, '2026-10-07', OFERTAS),
  mov('d', 'DESPESA', 486.32, '2026-10-08', ENERGIA),
  mov('e', 'DESPESA', '142.18', '2026-10-08', ENERGIA), // BigDecimal como texto também vale
  mov('f', 'RECEITA', 450, '2026-11-02', DIZIMOS),
];

describe('totaisDasMovimentacoes', () => {
  it('soma em centavos, sem erro de float, e calcula o saldo', () => {
    // Em float: 0.1 + 0.2 + 812.4 = 812.6999999999999.
    const outubro = MOVIMENTACOES.filter((m) => m.data < '2026-11-01');
    expect(totaisDasMovimentacoes(outubro)).toEqual({ receitas: 81270, despesas: 62850, saldo: 18420 });
  });

  it('saldo negativo quando as despesas passam as receitas', () => {
    const despesas = MOVIMENTACOES.filter((m) => m.tipo === 'DESPESA');
    expect(totaisDasMovimentacoes(despesas)).toEqual({ receitas: 0, despesas: 62850, saldo: -62850 });
  });

  it('lista vazia → tudo zero', () => {
    expect(totaisDasMovimentacoes([])).toEqual({ receitas: 0, despesas: 0, saldo: 0 });
  });
});

describe('totaisDoResumo', () => {
  it('converte o ResumoFinanceiroResponse para centavos', () => {
    expect(totaisDoResumo({ totalReceitas: 4097.9, totalDespesas: 2328.5, saldo: 1769.4 })).toEqual({
      receitas: 409790,
      despesas: 232850,
      saldo: 176940,
    });
    expect(totaisDoResumo(null)).toBeNull();
  });

  it('confere com os totais calculados da lista', () => {
    const oficiais = { receitas: 81270, despesas: 62850, saldo: 18420 };
    expect(totaisConferem(totaisDasMovimentacoes(MOVIMENTACOES.slice(0, 5)), oficiais)).toBe(true);
    expect(totaisConferem(totaisDasMovimentacoes(MOVIMENTACOES.slice(0, 4)), oficiais)).toBe(false);
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

  it('com tipo, só o daquele tipo; com categoria, nenhum (o summary não separa por categoria)', () => {
    expect(totaisDaLista(resumo, { tipo: 'DESPESA' })).toEqual([{ tipo: 'DESPESA', centavos: 232850 }]);
    expect(totaisDaLista(resumo, { tipo: 'RECEITA' })).toEqual([{ tipo: 'RECEITA', centavos: 409790 }]);
    expect(totaisDaLista(resumo, { categoria: 'c1' })).toEqual([]);
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
});

describe('serieDoFluxoDeCaixa', () => {
  it('por dia: um ponto por dia do período, inclusive os vazios', () => {
    const serie = serieDoFluxoDeCaixa(MOVIMENTACOES, { de: '2026-10-01', ate: '2026-10-08' });
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

  it('por mês: soma cada mês e ignora o que está fora do período', () => {
    const serie = serieDoFluxoDeCaixa(MOVIMENTACOES, { de: '2026-09-15', ate: '2026-11-01', agrupamento: 'mes' });
    expect(serie).toEqual([
      { chave: '2026-09', receitas: 0, despesas: 0, saldo: 0 },
      { chave: '2026-10', receitas: 81270, despesas: 62850, saldo: 18420 },
      // 02/11 fica fora (o período acaba em 01/11).
      { chave: '2026-11', receitas: 0, despesas: 0, saldo: 0 },
    ]);
  });

  it('a soma da série é o total do período', () => {
    const periodo = { de: '2026-10-01', ate: '2026-11-30' };
    const serie = serieDoFluxoDeCaixa(MOVIMENTACOES, periodo);
    const somaReceitas = serie.reduce((soma, p) => soma + p.receitas, 0);
    expect(somaReceitas).toBe(totaisDasMovimentacoes(MOVIMENTACOES).receitas);
  });

  it('período inválido → série vazia', () => {
    expect(serieDoFluxoDeCaixa(MOVIMENTACOES, { de: '2026-10-08', ate: '2026-10-01' })).toEqual([]);
  });
});

describe('totaisPorCategoria', () => {
  it('soma por categoria do tipo, da maior para a menor, com a fração', () => {
    const receitas = totaisPorCategoria(MOVIMENTACOES, 'RECEITA');
    expect(receitas.map(({ categoria, total, quantidade }) => [categoria.nome, total, quantidade])).toEqual([
      ['Ofertas', 81260, 2],
      ['Dízimos', 45010, 2],
    ]);
    expect(receitas[0].fracao + receitas[1].fracao).toBeCloseTo(1);
    expect(totaisPorCategoria(MOVIMENTACOES, 'DESPESA')).toEqual([
      { categoria: { id: 'c3', nome: 'Água e energia' }, total: 62850, quantidade: 2, fracao: 1 },
    ]);
  });

  it('sem movimentações do tipo → lista vazia', () => {
    expect(totaisPorCategoria([], 'RECEITA')).toEqual([]);
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
