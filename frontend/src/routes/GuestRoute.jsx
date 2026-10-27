import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { destinoAposLogin } from '../utils/redirecionamento';

/**
 * Só para visitantes. É também quem conclui o login: quando a sessão surge,
 * envia o usuário para a rota que ele tentou acessar (ou para a rota inicial do perfil).
 */
export function GuestRoute({ children }) {
  const { autenticado, usuario } = useAuth();
  const { state } = useLocation();

  if (autenticado) {
    return <Navigate to={destinoAposLogin(state?.origem, usuario?.perfil)} replace />;
  }
  return children;
}
