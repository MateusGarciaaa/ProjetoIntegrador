import { ROTAS, rotaInicialDoPerfil } from '../constants/rotas';

/**
 * Aceita só caminhos internos, para impedir redirecionamento aberto via state manipulado.
 * Barra invertida nunca é aceita: o navegador trata "/\evil.com" como "//evil.com"
 * (variante do CVE de redirecionamento aberto do react-router 6).
 */
export function destinoAposLogin(origem, perfil) {
  const valido =
    typeof origem === 'string' &&
    origem.startsWith('/') &&
    !origem.startsWith('//') &&
    !origem.includes('\\') &&
    !origem.startsWith(ROTAS.LOGIN);
  return valido ? origem : rotaInicialDoPerfil(perfil);
}
