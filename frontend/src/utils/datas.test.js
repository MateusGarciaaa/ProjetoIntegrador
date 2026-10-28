import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  agoraNoFuso,
  dataBrParaIso,
  diaDaSemana,
  formatarData,
  formatarDataDigitada,
  formatarDataHora,
  formatarDataPorExtenso,
  formatarHorario,
  formatarHorarioDigitado,
  formatarMesAno,
  hojeIso,
  horarioComSegundos,
  isDataIsoValida,
  isHorarioValido,
} from './datas';

describe('formatarData (LocalDate)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('converte AAAA-MM-DD para dd/mm/aaaa', () => {
    expect(formatarData('2026-03-05')).toBe('05/03/2026');
  });

  it('não "volta um dia" em fuso negativo', () => {
    // new Date('2026-01-01') seria 31/12/2025 21:00 em São Paulo.
    vi.stubEnv('TZ', 'America/Sao_Paulo');
    expect(formatarData('2026-01-01')).toBe('01/01/2026');
  });

  it('valor vazio ou inválido vira texto vazio', () => {
    [null, undefined, '', '2026-02-30', '05/03/2026', '2026-3-5'].forEach((valor) => expect(formatarData(valor)).toBe(''));
  });
});

describe('dataBrParaIso', () => {
  it('converte dd/mm/aaaa para AAAA-MM-DD', () => {
    expect(dataBrParaIso(' 05/03/2026 ')).toBe('2026-03-05');
  });

  it('recusa datas inexistentes ou mal formatadas', () => {
    ['31/02/2026', '5/3/2026', '', null].forEach((valor) => expect(dataBrParaIso(valor)).toBeNull());
  });
});

describe('formatarHorario (LocalTime)', () => {
  it('mostra só horas e minutos', () => {
    expect(formatarHorario('19:00:00')).toBe('19:00');
    expect(formatarHorario('07:30')).toBe('07:30');
    expect(formatarHorario('07:30:15.5')).toBe('07:30');
  });

  it('valor inválido vira texto vazio', () => {
    ['', null, '7:30', 'abc'].forEach((valor) => expect(formatarHorario(valor)).toBe(''));
  });
});

describe('formatarDataHora (LocalDateTime, sem fuso)', () => {
  it('lê data e hora como foram enviadas, sem converter fuso', () => {
    expect(formatarDataHora('2026-03-05T19:30:12.123456')).toBe('05/03/2026 19:30');
    expect(formatarDataHora('2026-01-01T00:10')).toBe('01/01/2026 00:10');
  });

  it('valor inválido vira texto vazio', () => {
    ['', null, '2026-03-05', '2026-03-05 19:30', '2026-13-01T10:00'].forEach((valor) =>
      expect(formatarDataHora(valor)).toBe(''),
    );
  });
});

describe('hojeIso e isDataIsoValida', () => {
  it('usa a data local', () => {
    expect(hojeIso(new Date(2026, 0, 9, 23, 59))).toBe('2026-01-09');
  });

  it('valida dias reais (inclusive bissexto)', () => {
    expect(isDataIsoValida('2028-02-29')).toBe(true);
    expect(isDataIsoValida('2026-02-29')).toBe(false);
  });
});

describe('formatarDataDigitada (máscara DD/MM/AAAA)', () => {
  it('insere as barras enquanto a pessoa digita', () => {
    expect(formatarDataDigitada('0')).toBe('0');
    expect(formatarDataDigitada('05')).toBe('05');
    expect(formatarDataDigitada('050')).toBe('05/0');
    expect(formatarDataDigitada('0503')).toBe('05/03');
    expect(formatarDataDigitada('05032')).toBe('05/03/2');
    expect(formatarDataDigitada('05032026')).toBe('05/03/2026');
  });

  it('ignora o que não é dígito e corta em 8 dígitos', () => {
    expect(formatarDataDigitada('05/03/2026999')).toBe('05/03/2026');
    expect(formatarDataDigitada('5a-3')).toBe('53');
    expect(formatarDataDigitada('')).toBe('');
  });
});

describe('horário digitado (máscara HH:mm, 24 h)', () => {
  it('insere os dois-pontos e corta em 4 dígitos', () => {
    expect(formatarHorarioDigitado('1')).toBe('1');
    expect(formatarHorarioDigitado('19')).toBe('19');
    expect(formatarHorarioDigitado('193')).toBe('19:3');
    expect(formatarHorarioDigitado('193099')).toBe('19:30');
    expect(formatarHorarioDigitado('19h30')).toBe('19:30');
  });

  it('isHorarioValido aceita 00:00–23:59 e recusa o resto', () => {
    ['00:00', '09:05', '19:30', '23:59'].forEach((valor) => expect(isHorarioValido(valor)).toBe(true));
    ['24:00', '19:60', '9:30', '19:3', '', null, '19:30:00', '7 PM'].forEach((valor) => expect(isHorarioValido(valor)).toBe(false));
  });

  it('horarioComSegundos completa os segundos para comparar como texto', () => {
    expect(horarioComSegundos('19:30')).toBe('19:30:00');
    expect(horarioComSegundos('19:30:15')).toBe('19:30:15');
    expect(horarioComSegundos('19:30:15.123')).toBe('19:30:15');
    expect(horarioComSegundos('')).toBe('');
  });
});

describe('agoraNoFuso', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('dá a data e a hora de São Paulo, qualquer que seja o fuso do navegador', () => {
    // 02:30 UTC de 01/11 ainda é 31/10, 23:30, em São Paulo (UTC−3).
    const instante = new Date(Date.UTC(2026, 10, 1, 2, 30, 5));
    vi.stubEnv('TZ', 'Asia/Tokyo');
    expect(agoraNoFuso('America/Sao_Paulo', instante)).toEqual({ data: '2026-10-31', horario: '23:30:05' });
    expect(agoraNoFuso('UTC', instante)).toEqual({ data: '2026-11-01', horario: '02:30:05' });
  });

  it('meia-noite sai como 00, não 24', () => {
    expect(agoraNoFuso('UTC', new Date(Date.UTC(2026, 0, 1, 0, 0, 0))).horario).toBe('00:00:00');
  });
});

describe('nomes de mês e dia da semana', () => {
  it('formatarMesAno', () => {
    expect(formatarMesAno('2026-10')).toBe('outubro de 2026');
    expect(formatarMesAno('2026-13')).toBe('');
  });

  it('diaDaSemana (0 = domingo) e data por extenso, sem depender do fuso', () => {
    vi.stubEnv('TZ', 'America/Sao_Paulo');
    expect(diaDaSemana('2026-11-01')).toBe(0);
    expect(formatarDataPorExtenso('2026-11-05')).toBe('quinta-feira, 05/11/2026');
    expect(formatarDataPorExtenso('2026-02-30')).toBe('');
    vi.unstubAllEnvs();
  });
});
