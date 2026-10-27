import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CarregandoPagina } from '../components/ui/CarregandoPagina';
import { PERMISSOES } from '../constants/permissoes';
import { ROTAS, rotaInicialDoPerfil } from '../constants/rotas';
import { useAuth } from '../hooks/useAuth';
import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { GuestRoute } from './GuestRoute';
import { ProtectedRoute } from './ProtectedRoute';
import { RequirePermission } from './RequirePermission';

/** Cada página vira um arquivo separado, baixado só quando a rota é aberta. */
function carregarPagina(importar, nome) {
  return lazy(() => importar().then((modulo) => ({ default: modulo[nome] })));
}

const LoginPage = carregarPagina(() => import('../pages/LoginPage'), 'LoginPage');
const EsqueciSenhaPage = carregarPagina(() => import('../pages/EsqueciSenhaPage'), 'EsqueciSenhaPage');
const RedefinirSenhaPage = carregarPagina(() => import('../pages/RedefinirSenhaPage'), 'RedefinirSenhaPage');
const MembrosPage = carregarPagina(() => import('../pages/MembrosPage'), 'MembrosPage');
const EmConstrucaoPage = carregarPagina(() => import('../pages/EmConstrucaoPage'), 'EmConstrucaoPage');
const NotFoundPage = carregarPagina(() => import('../pages/NotFoundPage'), 'NotFoundPage');

function RedirecionamentoInicial() {
  const { autenticado, usuario } = useAuth();
  return <Navigate to={autenticado ? rotaInicialDoPerfil(usuario?.perfil) : ROTAS.LOGIN} replace />;
}

/** Rota autenticada que exige uma permissão; sem ela, mostra a página "Sem acesso". */
function rotaProtegida(caminho, permissao, area, pagina) {
  return (
    <Route
      path={caminho}
      element={
        <RequirePermission permissao={permissao} area={area}>
          {pagina}
        </RequirePermission>
      }
    />
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<CarregandoPagina />}>
      <Routes>
        <Route path={ROTAS.INICIO} element={<RedirecionamentoInicial />} />

        <Route element={<AuthLayout />}>
          <Route path={ROTAS.LOGIN} element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path={ROTAS.ESQUECI_SENHA} element={<GuestRoute><EsqueciSenhaPage /></GuestRoute>} />
          {/* Sem GuestRoute: quem está logado e abre o link do e-mail não perde o token num redirecionamento. */}
          <Route path={ROTAS.REDEFINIR_SENHA} element={<RedefinirSenhaPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {rotaProtegida(ROTAS.DASHBOARD, PERMISSOES.DASHBOARD_VISUALIZAR, 'Painel', <EmConstrucaoPage titulo="Painel" />)}
          {rotaProtegida(ROTAS.MEMBROS, PERMISSOES.MEMBROS_VISUALIZAR, 'Membros', <MembrosPage />)}
          {rotaProtegida(ROTAS.EVENTOS, PERMISSOES.EVENTOS_VISUALIZAR, 'Eventos', <EmConstrucaoPage titulo="Eventos" />)}
          {rotaProtegida(ROTAS.FINANCEIRO, PERMISSOES.FINANCEIRO_VISUALIZAR, 'Financeiro', <EmConstrucaoPage titulo="Financeiro" />)}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
