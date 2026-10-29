/** Escala do BigDecimal no backend: @Digits(integer = 10, fraction = 2). */
export const CASAS_DECIMAIS = 2;

const FATOR_CENTAVOS = 10 ** CASAS_DECIMAIS;

const FORMATO_BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: CASAS_DECIMAIS,
  maximumFractionDigits: CASAS_DECIMAIS,
});

/** 1234.5 → "R$ 1.234,50". Valor ausente ou não numérico → "". */
export function formatarMoeda(valor) {
  const numero = typeof valor === 'string' ? Number(valor) : valor;
  return Number.isFinite(numero) ? FORMATO_BRL.format(numero) : '';
}

/**
 * Arredonda para centavos antes de enviar: 0.1 + 0.2 = 0.30000000000000004 teria
 * mais casas do que o @Digits aceita e o backend responderia 400.
 * Number.EPSILON corrige casos como 1.005, guardado em binário como 1.00499…
 */
export function arredondarValor(valor) {
  if (!Number.isFinite(valor)) return null;
  return Math.round((valor + Math.sign(valor) * Number.EPSILON) * FATOR_CENTAVOS) / FATOR_CENTAVOS;
}

/** "1.234,56" (ou "R$ 1.234,56") → 1234.56. Texto vazio ou inválido → null. */
export function lerValorBr(texto) {
  const limpo = String(texto ?? '').replace(/R\$|\s/g, '');
  if (!/^-?[\d.]*,?\d*$/.test(limpo) || !/\d/.test(limpo)) return null;
  const numero = Number(limpo.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numero) ? arredondarValor(numero) : null;
}

/*
 * Contas de dinheiro em centavos inteiros: somar 0.1 + 0.2 em float dá 0.30000000000000004,
 * somar 10 + 20 centavos dá 30. Os valores só viram reais (número com até 2 casas) na hora
 * de enviar ao backend ou de formatar.
 */

const FORMATO_DECIMAL = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: CASAS_DECIMAIS,
  maximumFractionDigits: CASAS_DECIMAIS,
});

const PADRAO_DECIMAL = /^(-?)(\d+)(?:\.(\d*))?$/;

/**
 * BigDecimal do backend (número JSON 450 ou 275.5, ou texto "450.00") → centavos inteiros.
 * Lê o texto do número, sem multiplicar o float por 100 (1.15 * 100 = 114.99999999999999).
 * Mais de 2 casas → arredonda. Ausente ou inválido → null.
 */
export function paraCentavos(valor) {
  let texto = null;
  if (typeof valor === 'string') texto = valor.trim();
  else if (Number.isFinite(valor)) texto = String(valor);
  const partes = PADRAO_DECIMAL.exec(texto ?? '');
  if (!partes) return null;
  const [, sinal, inteiros, decimais = ''] = partes;
  if (decimais.length > CASAS_DECIMAIS) {
    const arredondado = arredondarValor(Number(texto));
    return arredondado === null ? null : Math.round(arredondado * FATOR_CENTAVOS);
  }
  const centavos = Number(inteiros) * FATOR_CENTAVOS + Number(decimais.padEnd(CASAS_DECIMAIS, '0'));
  return sinal ? -centavos : centavos;
}

/**
 * Centavos → número em reais, com no máximo 2 casas: 1999 → 19.99. A divisão de um inteiro
 * por 100 sempre gera o número mais próximo, que o JSON escreve como "19.99" (exato no BigDecimal).
 */
export function centavosParaValor(centavos) {
  return Number.isInteger(centavos) ? centavos / FATOR_CENTAVOS : null;
}

/** Valor do backend → texto do campo de edição: 1234.5 → "1.234,50". Ausente → "". */
export function valorParaCampo(valor) {
  const centavos = paraCentavos(valor);
  return centavos === null ? '' : FORMATO_DECIMAL.format(centavos / FATOR_CENTAVOS);
}

/** Texto digitado em formato brasileiro → centavos inteiros. Vazio ou inválido → null. */
export function lerCentavosBr(texto) {
  const valor = lerValorBr(texto);
  return valor === null ? null : paraCentavos(valor);
}

/**
 * Máscara do campo de valor, aplicada a cada digitação (sem pontos de milhar enquanto a pessoa
 * digita, para o cursor não pular; o campo é formatado ao sair dele, com valorParaCampo):
 *   - aceita só dígitos e um separador decimal: vírgula, ou ponto (teclado numérico);
 *   - texto com vírgula ("1.234,56", colado): os pontos são de milhar e saem;
 *   - só pontos: um ponto seguido de até 2 dígitos é decimal ("10.5"), senão é milhar ("1.234");
 *   - no máximo `digitosInteiros` antes da vírgula e 2 depois. Nunca aceita sinal de menos.
 */
export function mascararValorDigitado(texto, { digitosInteiros = 10 } = {}) {
  let limpo = String(texto ?? '').replace(/[^\d.,]/g, '');
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '');
  else if ((limpo.match(/\./g) ?? []).length === 1 && /\.\d{0,2}$/.test(limpo)) limpo = limpo.replace('.', ',');
  else limpo = limpo.replace(/\./g, '');

  const virgula = limpo.indexOf(',');
  const inteiros = (virgula < 0 ? limpo : limpo.slice(0, virgula)).replace(/^0+(?=\d)/, '').slice(0, digitosInteiros);
  if (virgula < 0) return inteiros;
  const decimais = limpo.slice(virgula + 1).replace(/,/g, '').slice(0, CASAS_DECIMAIS);
  return `${inteiros || '0'},${decimais}`;
}
