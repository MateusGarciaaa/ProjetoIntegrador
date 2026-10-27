import { ROTAS, rotaInicialDoPerfil } from '../constants/rotas';

/** Aceita só caminhos internos, para impedir redirecionamento aberto via state manipulado. */
export function destinoAposLogin(origem, perfil) {
  const valido =
    typeof origem === 'string' &&
    origem.startsWith('/') &&
    !origem.startsWith('//') &&
    !origem.startsWith(ROTAS.LOGIN);
  return valido ? origem : rotaInicialDoPerfil(perfil);
}
