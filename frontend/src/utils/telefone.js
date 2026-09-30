import { somenteDigitos } from './strings';

const TAMANHO_MAXIMO_TELEFONE = 11;

/** Máscara progressiva: (00) 0000-0000 ou (00) 00000-0000 */
export function formatarTelefone(valor) {
  const digitos = somenteDigitos(valor).slice(0, TAMANHO_MAXIMO_TELEFONE);
  if (!digitos) return '';
  if (digitos.length <= 2) return `(${digitos}`;

  const ddd = digitos.slice(0, 2);
  const numero = digitos.slice(2);
  const tamanhoPrefixo = digitos.length === 11 ? 5 : 4;
  if (numero.length <= tamanhoPrefixo) return `(${ddd}) ${numero}`;
  return `(${ddd}) ${numero.slice(0, tamanhoPrefixo)}-${numero.slice(tamanhoPrefixo)}`;
}

/** Para exibição: formata números completos e devolve o valor original nos demais casos. */
export function exibirTelefone(valor) {
  if (!valor) return null;
  const digitos = somenteDigitos(valor);
  return digitos.length === 10 || digitos.length === 11 ? formatarTelefone(digitos) : String(valor);
}
