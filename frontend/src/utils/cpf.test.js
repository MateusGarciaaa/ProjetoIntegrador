import { describe, expect, it } from 'vitest';
import { calcularDigitosVerificadoresCpf, formatarCpf, isCpfValido } from './cpf';

describe('isCpfValido', () => {
  it.each(['529.982.247-25', '52998224725', '111.444.777-35'])('aceita CPF válido %s', (cpf) => {
    expect(isCpfValido(cpf)).toBe(true);
  });

  it('recusa dígito verificador errado', () => {
    expect(isCpfValido('529.982.247-24')).toBe(false);
    expect(isCpfValido('52998224735')).toBe(false);
  });

  it('recusa sequências de um mesmo dígito, que passariam no cálculo', () => {
    ['00000000000', '11111111111', '99999999999'].forEach((cpf) => expect(isCpfValido(cpf)).toBe(false));
  });

  it('recusa tamanhos diferentes de 11 e valores vazios', () => {
    ['', null, undefined, '5299822472', '529982247250'].forEach((cpf) => expect(isCpfValido(cpf)).toBe(false));
  });
});

describe('calcularDigitosVerificadoresCpf', () => {
  it('calcula os dois dígitos a partir da base', () => {
    expect(calcularDigitosVerificadoresCpf('529982247')).toBe('25');
    expect(calcularDigitosVerificadoresCpf('111444777')).toBe('35');
  });

  it('exige base de 9 dígitos', () => {
    expect(() => calcularDigitosVerificadoresCpf('123')).toThrow();
  });
});

describe('formatarCpf', () => {
  it.each([
    ['', ''],
    ['529', '529'],
    ['5299', '529.9'],
    ['529982', '529.982'],
    ['5299822', '529.982.2'],
    ['529982247', '529.982.247'],
    ['5299822472', '529.982.247-2'],
    ['52998224725', '529.982.247-25'],
    ['529982247259999', '529.982.247-25'],
    ['529.982.247-25', '529.982.247-25'],
  ])('%s → %s', (entrada, esperado) => {
    expect(formatarCpf(entrada)).toBe(esperado);
  });
});
