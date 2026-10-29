import { describe, expect, it } from 'vitest';
import {
  arredondarValor,
  centavosParaValor,
  formatarMoeda,
  lerCentavosBr,
  lerValorBr,
  mascararValorDigitado,
  paraCentavos,
  valorParaCampo,
} from './moeda';

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

describe('paraCentavos', () => {
  it('lê o BigDecimal do backend como número ou texto, sem erro de float', () => {
    expect(paraCentavos(450)).toBe(45000);
    expect(paraCentavos(275.5)).toBe(27550);
    expect(paraCentavos(1.15)).toBe(115); // 1.15 * 100 daria 114.99999999999999
    expect(paraCentavos('486.32')).toBe(48632);
    expect(paraCentavos('720.00')).toBe(72000);
    expect(paraCentavos(0.01)).toBe(1);
    expect(paraCentavos(9999999999.99)).toBe(999999999999);
  });

  it('arredonda o que tiver mais de 2 casas', () => {
    expect(paraCentavos(0.1 + 0.2)).toBe(30);
    expect(paraCentavos('1.005')).toBe(101);
  });

  it('ausente ou inválido vira null', () => {
    [null, undefined, '', 'abc', Number.NaN, '1e3', {}].forEach((valor) => expect(paraCentavos(valor)).toBeNull());
  });
});

describe('centavosParaValor', () => {
  it('devolve o número com no máximo 2 casas, que o JSON escreve exato', () => {
    expect(centavosParaValor(1999)).toBe(19.99);
    expect(JSON.stringify({ valor: centavosParaValor(1999) })).toBe('{"valor":19.99}');
    expect(centavosParaValor(30)).toBe(0.3);
    expect(centavosParaValor(45000)).toBe(450);
  });

  it('só aceita inteiros', () => {
    expect(centavosParaValor(10.5)).toBeNull();
    expect(centavosParaValor(null)).toBeNull();
  });
});

describe('valorParaCampo', () => {
  it('formata o valor do backend para o campo de edição, sem "R$"', () => {
    expect(valorParaCampo(1234.5)).toBe('1.234,50');
    expect(valorParaCampo('450.00')).toBe('450,00');
    // O BigDecimal 450.00 chega no JSON como número; no JS vira 450, e o campo mostra as 2 casas.
    expect(valorParaCampo(JSON.parse('{"valor":450.00}').valor)).toBe('450,00');
    expect(valorParaCampo(450)).toBe('450,00');
    expect(valorParaCampo(12000)).toBe('12.000,00');
    expect(valorParaCampo(0.01)).toBe('0,01');
    expect(valorParaCampo(null)).toBe('');
  });
});

describe('mascararValorDigitado', () => {
  it('aceita dígitos e uma vírgula, com no máximo 2 casas', () => {
    expect(mascararValorDigitado('1234')).toBe('1234');
    expect(mascararValorDigitado('1234,5')).toBe('1234,5');
    expect(mascararValorDigitado('1234,567')).toBe('1234,56');
    expect(mascararValorDigitado('12,3,4')).toBe('12,34');
    expect(mascararValorDigitado(',5')).toBe('0,5');
    expect(mascararValorDigitado('007')).toBe('7');
    expect(mascararValorDigitado('')).toBe('');
  });

  it('nunca aceita sinal de menos nem letras', () => {
    expect(mascararValorDigitado('-50')).toBe('50');
    expect(mascararValorDigitado('R$ 12a,3b')).toBe('12,3');
  });

  it('entende o texto colado no formato brasileiro (pontos de milhar)', () => {
    expect(mascararValorDigitado('1.234,56')).toBe('1234,56');
    expect(mascararValorDigitado('R$ 1.234.567,89')).toBe('1234567,89');
    expect(mascararValorDigitado('1.234')).toBe('1234');
  });

  it('ponto do teclado numérico vira vírgula', () => {
    expect(mascararValorDigitado('10.')).toBe('10,');
    expect(mascararValorDigitado('10.5')).toBe('10,5');
    expect(mascararValorDigitado('10.50')).toBe('10,50');
  });

  it('limita os dígitos antes da vírgula (@Digits integer = 10)', () => {
    expect(mascararValorDigitado('123456789012')).toBe('1234567890');
    expect(mascararValorDigitado('123', { digitosInteiros: 2 })).toBe('12');
  });
});

describe('ida e volta', () => {
  it('campo → centavos → número enviado → resposta → campo', () => {
    ['1.234,56', '0,01', '450,00', '9.999.999.999,99', '19,90'].forEach((texto) => {
      const centavos = lerCentavosBr(mascararValorDigitado(texto));
      const enviado = centavosParaValor(centavos);
      // O backend devolve o mesmo BigDecimal (número JSON).
      const recebido = JSON.parse(JSON.stringify({ valor: enviado })).valor;
      expect(valorParaCampo(recebido)).toBe(texto);
      expect(paraCentavos(recebido)).toBe(centavos);
    });
  });

  it('lerCentavosBr lê o texto do campo; vazio ou inválido → null', () => {
    expect(lerCentavosBr('1234,5')).toBe(123450);
    expect(lerCentavosBr('')).toBeNull();
    expect(lerCentavosBr('abc')).toBeNull();
  });
});
