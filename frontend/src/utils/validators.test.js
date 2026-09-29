import { describe, expect, it } from 'vitest';
import { isValidCpf, isValidEmail, isValidPhone } from './validators';

describe('isValidCpf', () => {
  it('aceita CPF válido com ou sem máscara', () => {
    expect(isValidCpf('52601815906')).toBe(true);
    expect(isValidCpf('526.018.159-06')).toBe(true);
  });

  it('rejeita dígito verificador incorreto', () => {
    expect(isValidCpf('52601815907')).toBe(false);
  });

  it('rejeita sequências repetidas e tamanhos inválidos', () => {
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('1234567890')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('valida formato básico', () => {
    expect(isValidEmail('nome@igreja.com')).toBe(true);
    expect(isValidEmail('nome@igreja')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('aceita fixo e celular com DDD', () => {
    expect(isValidPhone('(11) 3322-4455')).toBe(true);
    expect(isValidPhone('(11) 91234-5678')).toBe(true);
    expect(isValidPhone('91234-5678')).toBe(false);
  });
});
