import { Navigate, Route, Routes } from 'react-router-dom';
import { PERMISSOES } from '../constants/permissoes';
import { ROTAS, ROTA_PADRAO_AUTENTICADA } from '../constants/rotas';
import { useAuth } from '../hooks/useAuth';
import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { LoginPage } from '../pages/LoginPage';
import { MembrosPage } from '../pages/MembrosPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { GuestRoute } from './GuestRoute';
import { ProtectedRoute } from './ProtectedRoute';
import { RequirePermission } from './RequirePermission';

function RedirecionamentoInicial() {
  const { autenticado } = useAuth();
  return <Navigate to={autenticado ? ROTA_PADRAO_AUTENTICADA : ROTAS.LOGIN} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROTAS.INICIO} element={<RedirecionamentoInicial />} />

      <Route
        element={
          <GuestRoute>
            <AuthLayout />
          </GuestRoute>
        }
      >
        <Route path={ROTAS.LOGIN} element={<LoginPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path={ROTAS.MEMBROS}
          element={
            <RequirePermission permissao={PERMISSOES.MEMBROS_VISUALIZAR} area="membros">
              <MembrosPage />
            </RequirePermission>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
