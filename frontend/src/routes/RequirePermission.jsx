import { usePermissao } from '../hooks/usePermissao';
import { SemAcessoPage } from '../pages/SemAcessoPage';

/** Sem a permissão, explica o motivo em vez de mostrar a tela. */
export function RequirePermission({ permissao, area, children }) {
  const { pode } = usePermissao();
  return pode(permissao) ? children : <SemAcessoPage permissao={permissao} area={area} />;
}
