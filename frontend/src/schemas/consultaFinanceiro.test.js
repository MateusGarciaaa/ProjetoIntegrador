import { describe, expect, it } from 'vitest';
import { agoraDoServidor } from './regrasEvento';
import {
  descreverPeriodo,
  lerConsultaFinanceiro,
  mesDoPeriodo,
  parametrosDaConsultaFinanceiro,
  parametrosDoPeriodo,
  periodoDoMesVizinho,
  periodoPadrao,
} from './consultaFinanceiro';

const HOJE = '2026-10-27';
const UUID = '82940e05-3d5a-41de-8717-36cb215f78b6';

function ler(texto) {
  return lerConsultaFinanceiro(new URLSearchParams(texto), { hoje: HOJE });
}

describe('lerConsultaFinanceiro', () => {
  it('sem parâmetros: mês atual, sem filtros, 1ª página', () => {
    expect(ler('')).toEqual({ de: '2026-10-01', ate: '2026-10-31', tipo: '', categoria: '', pagina: 0 });
  });

  it('lê período, tipo, categoria e página', () => {
    expect(ler(`de=2026-09-01&ate=2026-09-15&tipo=DESPESA&categoria=${UUID}&pagina=3`)).toEqual({
      de: '2026-09-01',
      ate: '2026-09-15',
      tipo: 'DESPESA',
      categoria: UUID,
      pagina: 2,
    });
  });

  it('valores inválidos voltam ao padrão', () => {
    expect(ler('de=2026-09-30&ate=2026-09-01&tipo=OUTRO&categoria=abc&pagina=-1')).toEqual(ler(''));
    expect(ler('de=2026-09-01')).toEqual(ler(''));
  });
});

describe('parametrosDaConsultaFinanceiro', () => {
  it('URL limpa com os valores padrão', () => {
    expect(parametrosDaConsultaFinanceiro(ler(''), { hoje: HOJE })).toEqual({});
  });

  it('ida e volta pela URL', () => {
    const consulta = { de: '2026-09-01', ate: '2026-09-30', tipo: 'RECEITA', categoria: UUID, pagina: 1 };
    const parametros = new URLSearchParams(parametrosDaConsultaFinanceiro(consulta, { hoje: HOJE }));
    expect(lerConsultaFinanceiro(parametros, { hoje: HOJE })).toEqual(consulta);
  });

  it('entre abas só o período acompanha', () => {
    const consulta = { de: '2026-09-01', ate: '2026-09-30', tipo: 'RECEITA', categoria: UUID, pagina: 1 };
    expect(parametrosDoPeriodo(consulta, { hoje: HOJE })).toEqual({ de: '2026-09-01', ate: '2026-09-30' });
  });
});

describe('períodos', () => {
  it('mês atual calculado no fuso de São Paulo, não no do navegador', () => {
    // 01/11/2026 01:30 UTC ainda é 31/10 às 22:30 em São Paulo.
    const hoje = agoraDoServidor(new Date(Date.UTC(2026, 10, 1, 1, 30))).data;
    expect(periodoPadrao(hoje)).toEqual({ de: '2026-10-01', ate: '2026-10-31' });
  });

  it('reconhece um mês inteiro e navega entre meses', () => {
    expect(mesDoPeriodo({ de: '2026-02-01', ate: '2026-02-28' })).toBe('2026-02');
    expect(mesDoPeriodo({ de: '2026-02-01', ate: '2026-02-27' })).toBeNull();
    expect(periodoDoMesVizinho({ de: '2026-01-10' }, -1)).toEqual({ de: '2025-12-01', ate: '2025-12-31' });
    expect(periodoDoMesVizinho({ de: '2026-01-10' }, 1)).toEqual({ de: '2026-02-01', ate: '2026-02-28' });
  });
});

describe('descreverPeriodo', () => {
  it('mês inteiro pelo nome; outros períodos pelas datas', () => {
    expect(descreverPeriodo({ de: '2026-10-01', ate: '2026-10-31' })).toBe('outubro de 2026');
    expect(descreverPeriodo({ de: '2026-10-01', ate: '2026-10-15' })).toBe('01/10/2026 a 15/10/2026');
    expect(descreverPeriodo({ de: '2026-10-05', ate: '2026-10-05' })).toBe('05/10/2026');
  });
});
