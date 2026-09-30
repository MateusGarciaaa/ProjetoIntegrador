import { useCallback } from 'react';
import { temPermissao } from '../constants/permissoes';
import { useAuth } from './useAuth';

/** pode(PERMISSOES.X) para decidir o que mostrar. O backend continua sendo a autoridade. */
export function usePermissao() {
  const { usuario } = useAuth();
  const perfil = usuario?.perfil ?? null;
  const pode = useCallback((permissao) => temPermissao(perfil, permissao), [perfil]);
  return { perfil, pode };
}
