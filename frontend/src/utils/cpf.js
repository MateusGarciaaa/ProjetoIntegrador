import { somenteDigitos } from './strings';

export const TAMANHO_CPF = 11;

function calcularDigito(numeros) {
  const pesoInicial = numeros.length + 1;
  const soma = numeros.reduce((total, numero, indice) => total + numero * (pesoInicial - indice), 0);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

/** Recebe os 9 primeiros dígitos e devolve os 2 dígitos verificadores. */
export function calcularDigitosVerificadoresCpf(base) {
  const numeros = somenteDigitos(base).split('').map(Number);
  if (numeros.length !== 9) {
    throw new Error('A base do CPF precisa ter 9 dígitos.');
  }
  const primeiro = calcularDigito(numeros);
  const segundo = calcularDigito([...numeros, primeiro]);
  return `${primeiro}${segundo}`;
}

export function isCpfValido(valor) {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== TAMANHO_CPF || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  return calcularDigitosVerificadoresCpf(cpf.slice(0, 9)) === cpf.slice(9);
}

/** Máscara progressiva: 000.000.000-00 */
export function formatarCpf(valor) {
  const digitos = somenteDigitos(valor).slice(0, TAMANHO_CPF);
  const blocos = [digitos.slice(0, 3), digitos.slice(3, 6), digitos.slice(6, 9)].filter(Boolean).join('.');
  return digitos.length > 9 ? `${blocos}-${digitos.slice(9)}` : blocos;
}
