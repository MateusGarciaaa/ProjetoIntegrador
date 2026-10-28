import { describe, expect, it } from 'vitest';
import { agruparPorData, gradeDoMes, intervaloDaGrade, isMesValido, limitesDoMes, somarDias, somarMeses } from './calendario';

describe('navegação entre meses', () => {
  it('soma e subtrai meses atravessando o ano', () => {
    expect(somarMeses('2026-01', -1)).toBe('2025-12');
    expect(somarMeses('2026-12', 1)).toBe('2027-01');
    expect(somarMeses('2026-10', 14)).toBe('2027-12');
  });

  it('isMesValido', () => {
    expect(isMesValido('2026-10')).toBe(true);
    ['2026-13', '2026-00', '2026-1', '', null, '2026-10-01'].forEach((valor) => expect(isMesValido(valor)).toBe(false));
  });

  it('limitesDoMes conhece fevereiro bissexto', () => {
    expect(limitesDoMes('2028-02')).toEqual({ inicio: '2028-02-01', fim: '2028-02-29' });
    expect(limitesDoMes('2026-02')).toEqual({ inicio: '2026-02-01', fim: '2026-02-28' });
    expect(limitesDoMes('2026-12')).toEqual({ inicio: '2026-12-01', fim: '2026-12-31' });
  });

  it('somarDias não pula nem repete dia na troca do horário de verão', () => {
    expect(somarDias('2026-10-31', 1)).toBe('2026-11-01');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('gradeDoMes', () => {
  it('tem 42 dias, começa no domingo e marca os dias do mês', () => {
    // 01/10/2026 é uma quinta-feira: a grade começa no domingo 27/09.
    const grade = gradeDoMes('2026-10');
    expect(grade).toHaveLength(42);
    expect(grade[0]).toEqual({ data: '2026-09-27', dia: 27, doMes: false });
    expect(grade[4]).toEqual({ data: '2026-10-01', dia: 1, doMes: true });
    expect(grade.filter((d) => d.doMes)).toHaveLength(31);
    expect(grade.at(-1).data).toBe('2026-11-07');
  });

  it('mês que começa no domingo não ganha semana vazia antes', () => {
    expect(gradeDoMes('2026-11')[0].data).toBe('2026-11-01');
  });

  it('intervaloDaGrade é o período pedido ao backend', () => {
    expect(intervaloDaGrade('2026-10')).toEqual({ inicio: '2026-09-27', fim: '2026-11-07' });
  });
});

describe('agruparPorData', () => {
  it('agrupa por dia e ordena pelo horário', () => {
    const eventos = [
      { id: 'b', data: '2026-11-01', horario: '19:00:00' },
      { id: 'a', data: '2026-11-01', horario: '09:00:00' },
      { id: 'c', data: '2026-11-04', horario: '20:00:00' },
      { id: 'x', data: 'inválida', horario: '20:00:00' },
    ];
    const grupos = agruparPorData(eventos);
    expect(Object.keys(grupos).sort()).toEqual(['2026-11-01', '2026-11-04']);
    expect(grupos['2026-11-01'].map((e) => e.id)).toEqual(['a', 'b']);
  });
});
