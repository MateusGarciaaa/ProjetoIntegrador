import { ROTAS, ROTA_PADRAO_AUTENTICADA } from '../constants/rotas';

/** Aceita só caminhos internos, para impedir redirecionamento aberto via state manipulado. */
export function destinoAposLogin(origem) {
  const valido =
    typeof origem === 'string' &&
    origem.startsWith('/') &&
    !origem.startsWith('//') &&
    !origem.startsWith(ROTAS.LOGIN);
  return valido ? origem : ROTA_PADRAO_AUTENTICADA;
}
