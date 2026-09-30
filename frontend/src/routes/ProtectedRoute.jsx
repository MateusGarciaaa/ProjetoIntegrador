import { Navigate, useLocation } from 'react-router-dom';
import { ROTAS } from '../constants/rotas';
import { useAuth } from '../hooks/useAuth';

/**
 * Sem sessão, manda para o login lembrando o destino — exceto quando o usuário
 * clicou em "Sair", para que outra pessoa não caia na tela de quem saiu.
 */
export function ProtectedRoute({ children }) {
  const { autenticado, saidaVoluntaria } = useAuth();
  const { pathname, search } = useLocation();

  if (!autenticado) {
    const state = saidaVoluntaria ? undefined : { origem: `${pathname}${search}` };
    return <Navigate to={ROTAS.LOGIN} replace state={state} />;
  }
  return children;
}
