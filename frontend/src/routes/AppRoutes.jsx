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
const MembroDetalhesPage = carregarPagina(() => import('../pages/MembroDetalhesPage'), 'MembroDetalhesPage');
const MembroFormPage = carregarPagina(() => import('../pages/MembroFormPage'), 'MembroFormPage');
const EventosPage = carregarPagina(() => import('../pages/EventosPage'), 'EventosPage');
const EventoDetalhesPage = carregarPagina(() => import('../pages/EventoDetalhesPage'), 'EventoDetalhesPage');
const EventoFormPage = carregarPagina(() => import('../pages/EventoFormPage'), 'EventoFormPage');
const FinanceiroPage = carregarPagina(() => import('../pages/FinanceiroPage'), 'FinanceiroPage');
const FluxoCaixaPage = carregarPagina(() => import('../pages/FluxoCaixaPage'), 'FluxoCaixaPage');
const RelatorioFinanceiroPage = carregarPagina(() => import('../pages/RelatorioFinanceiroPage'), 'RelatorioFinanceiroPage');
const MovimentacaoFormPage = carregarPagina(() => import('../pages/MovimentacaoFormPage'), 'MovimentacaoFormPage');
const DashboardPage = carregarPagina(() => import('../pages/DashboardPage'), 'DashboardPage');
const UsuariosPage = carregarPagina(() => import('../pages/UsuariosPage'), 'UsuariosPage');
const UsuarioFormPage = carregarPagina(() => import('../pages/UsuarioFormPage'), 'UsuarioFormPage');
const MinhaContaPage = carregarPagina(() => import('../pages/MinhaContaPage'), 'MinhaContaPage');
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
          {rotaProtegida(ROTAS.DASHBOARD, PERMISSOES.DASHBOARD_VISUALIZAR, 'Painel', <DashboardPage />)}
          {rotaProtegida(ROTAS.MEMBROS, PERMISSOES.MEMBROS_VISUALIZAR, 'Membros', <MembrosPage />)}
          {/* /membros/novo tem prioridade sobre /membros/:id (o React Router prefere o segmento fixo). */}
          {rotaProtegida(ROTAS.MEMBRO_NOVO, PERMISSOES.MEMBROS_CRIAR, 'Membros', <MembroFormPage />)}
          {rotaProtegida(ROTAS.MEMBRO_DETALHES, PERMISSOES.MEMBROS_VISUALIZAR, 'Membros', <MembroDetalhesPage />)}
          {rotaProtegida(ROTAS.MEMBRO_EDICAO, PERMISSOES.MEMBROS_EDITAR, 'Membros', <MembroFormPage />)}
          {rotaProtegida(ROTAS.EVENTOS, PERMISSOES.EVENTOS_VISUALIZAR, 'Eventos', <EventosPage />)}
          {/* /eventos/novo tem prioridade sobre /eventos/:id (o React Router prefere o segmento fixo). */}
          {rotaProtegida(ROTAS.EVENTO_NOVO, PERMISSOES.EVENTOS_CRIAR, 'Eventos', <EventoFormPage />)}
          {rotaProtegida(ROTAS.EVENTO_DETALHES, PERMISSOES.EVENTOS_VISUALIZAR, 'Eventos', <EventoDetalhesPage />)}
          {rotaProtegida(ROTAS.EVENTO_EDICAO, PERMISSOES.EVENTOS_EDITAR, 'Eventos', <EventoFormPage />)}
          {rotaProtegida(ROTAS.FINANCEIRO, PERMISSOES.FINANCEIRO_VISUALIZAR, 'Financeiro', <FinanceiroPage />)}
          {rotaProtegida(ROTAS.FLUXO_DE_CAIXA, PERMISSOES.FINANCEIRO_VISUALIZAR, 'Financeiro', <FluxoCaixaPage />)}
          {rotaProtegida(ROTAS.RELATORIO_FINANCEIRO, PERMISSOES.FINANCEIRO_VISUALIZAR, 'Financeiro', <RelatorioFinanceiroPage />)}
          {rotaProtegida(ROTAS.FINANCEIRO_NOVO, PERMISSOES.FINANCEIRO_CRIAR, 'Financeiro', <MovimentacaoFormPage />)}
          {rotaProtegida(ROTAS.FINANCEIRO_EDICAO, PERMISSOES.FINANCEIRO_EDITAR, 'Financeiro', <MovimentacaoFormPage />)}
          {rotaProtegida(ROTAS.USUARIOS, PERMISSOES.USUARIOS_GERENCIAR, 'Usuários', <UsuariosPage />)}
          {rotaProtegida(ROTAS.USUARIO_NOVO, PERMISSOES.USUARIOS_GERENCIAR, 'Usuários', <UsuarioFormPage />)}
          {rotaProtegida(ROTAS.USUARIO_EDICAO, PERMISSOES.USUARIOS_GERENCIAR, 'Usuários', <UsuarioFormPage />)}
          {rotaProtegida(ROTAS.MINHA_CONTA, PERMISSOES.CONTA_GERENCIAR, 'Minha conta', <MinhaContaPage />)}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
