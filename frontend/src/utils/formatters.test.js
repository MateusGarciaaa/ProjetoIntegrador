import { describe, expect, it } from 'vitest';
import { formatCpf, formatIsoDate, formatPhone } from './formatters';

describe('formatCpf', () => {
  it('aplica a máscara progressivamente', () => {
    expect(formatCpf('526')).toBe('526');
    expect(formatCpf('5260181')).toBe('526.018.1');
    expect(formatCpf('52601815906')).toBe('526.018.159-06');
  });

  it('ignora dígitos excedentes', () => {
    expect(formatCpf('526018159061234')).toBe('526.018.159-06');
  });
});

describe('formatPhone', () => {
  it('formata fixo e celular', () => {
    expect(formatPhone('1133224455')).toBe('(11) 3322-4455');
    expect(formatPhone('11912345678')).toBe('(11) 91234-5678');
  });

  it('retorna vazio para valor nulo', () => {
    expect(formatPhone(null)).toBe('');
  });
});

describe('formatIsoDate', () => {
  it('converte ISO para o padrão brasileiro sem depender de fuso horário', () => {
    expect(formatIsoDate('2001-01-30')).toBe('30/01/2001');
  });
});
