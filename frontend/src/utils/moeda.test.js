import { describe, expect, it } from 'vitest';
import { arredondarValor, formatarMoeda, lerValorBr } from './moeda';

/** O Intl separa "R$" do número com espaço não separável (U+00A0). */
const reais = (texto) => texto.replace(' ', ' ');

describe('formatarMoeda', () => {
  it('formata em BRL com duas casas', () => {
    expect(formatarMoeda(1234.5)).toBe(reais('R$ 1.234,50'));
    expect(formatarMoeda(0)).toBe(reais('R$ 0,00'));
    expect(formatarMoeda(-450)).toBe(reais('-R$ 450,00'));
  });

  it('aceita o BigDecimal vindo como texto', () => {
    expect(formatarMoeda('450.00')).toBe(reais('R$ 450,00'));
  });

  it('valor ausente ou não numérico vira texto vazio', () => {
    [null, undefined, 'abc', Number.NaN].forEach((valor) => expect(formatarMoeda(valor)).toBe(''));
  });
});

describe('arredondarValor', () => {
  it('corrige o erro de ponto flutuante antes de enviar', () => {
    expect(arredondarValor(0.1 + 0.2)).toBe(0.3);
    expect(arredondarValor(1.005)).toBe(1.01);
    expect(arredondarValor(10)).toBe(10);
  });

  it('não numérico vira null', () => {
    expect(arredondarValor(Number.NaN)).toBeNull();
    expect(arredondarValor('10')).toBeNull();
  });
});

describe('lerValorBr', () => {
  it('lê o formato brasileiro', () => {
    expect(lerValorBr('1.234,56')).toBe(1234.56);
    expect(lerValorBr('R$ 450,5')).toBe(450.5);
    expect(lerValorBr('12')).toBe(12);
  });

  it('texto vazio ou inválido vira null', () => {
    ['', null, 'abc', ',', '1,2,3'].forEach((valor) => expect(lerValorBr(valor)).toBeNull());
  });
});
