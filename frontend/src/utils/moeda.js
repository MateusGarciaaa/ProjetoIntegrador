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
