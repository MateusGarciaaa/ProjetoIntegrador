// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AppRoutes } from '../routes/AppRoutes';
import { salvarSessao } from '../services/auth/sessionStore';
import { CONTAS_DEMO, SENHA_DEMO } from '../services/mock/contasDemo';
import { criarServidorSimulado } from '../services/mock/servidorSimulado';
import '../test-utils/componentes';
import { instalarTransporte, transporteDoServidor } from '../test-utils/transporte';
import { ToastProvider } from './ToastProvider';
import { AuthProvider } from './AuthProvider';

const FLAGS_ROUTER = { v7_startTransition: true, v7_relativeSplatPath: true };
let transporte;

afterEach(() => {
  transporte?.restaurar();
  transporte = null;
  window.sessionStorage.clear();
});

/** Servidor simulado + login de verdade nele; o app abre com a sessão já salva (como depois de um F5). */
function prepararServidor() {
  const relogio = { agora: Date.now() };
  const atender = criarServidorSimulado({ validadeTokenSegundos: 3600, relogio: () => relogio.agora });
  const entrar = (perfil) => {
    const conta = CONTAS_DEMO.find((c) => c.perfil === perfil);
    const { data } = atender({ metodo: 'post', url: '/auth/login', corpo: { email: conta.email, password: SENHA_DEMO } });
    return data.token;
  };
  const admin = `Bearer ${entrar('ADMINISTRADOR')}`;
  const usuarioDe = (email) =>
    atender({ metodo: 'get', url: '/users', authorization: admin, params: { size: '2000' } }).data.content.find((u) => u.email === email);
  const alterar = (email, mudancas) => {
    const usuario = usuarioDe(email);
    atender({ metodo: 'put', url: `/users/${usuario.id}`, authorization: admin, corpo: { nome: usuario.nome, perfil: usuario.perfil, ...mudancas } });
  };
  transporte = instalarTransporte(transporteDoServidor(atender));
  return { entrar, alterar, relogio };
}

function abrirComSessao(token, caminho) {
  salvarSessao({ token, expiresAt: Date.now() + 3_600_000 });
  return render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[caminho]} future={FLAGS_ROUTER}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  );
}

describe('AuthProvider e a conta no servidor', () => {
  it('ao abrir o app, o topo mostra o nome atual do GET /me, não o do token', async () => {
    const { entrar, alterar } = prepararServidor();
    const token = entrar('SECRETARIO'); // claim nome = "Marcos Tavares"
    alterar('secretario@churchhub.local', { nome: 'Marcos Antônio Tavares' });

    abrirComSessao(token, '/eventos');

    expect(await screen.findByRole('link', { name: 'Minha conta: Marcos Antônio Tavares' })).toBeTruthy();
  });

  it('perfil alterado pelo administrador: a sessão cai e o login explica o motivo', async () => {
    const { entrar, alterar } = prepararServidor();
    const token = entrar('TESOUREIRO');
    alterar('tesoureiro@churchhub.local', { perfil: 'PASTOR' });

    abrirComSessao(token, '/financeiro');

    expect(await screen.findByText('Seu acesso foi alterado. Entre novamente.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy();
  });

  it('depois de trocar a senha, a sessão segue com o token novo', async () => {
    const { entrar, relogio } = prepararServidor();
    const tokenAntigo = entrar('MEMBRO');
    // A troca acontece segundos depois do login: o token antigo passa a ser recusado pelo servidor.
    relogio.agora += 5000;
    abrirComSessao(tokenAntigo, '/minha-conta');

    fireEvent.change(await screen.findByLabelText('Senha atual'), { target: { value: SENHA_DEMO } });
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senhaNova1' } });
    fireEvent.change(screen.getByLabelText('Confirme a nova senha'), { target: { value: 'senhaNova1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));

    expect(await screen.findByText(/^Senha alterada\./)).toBeTruthy();
    await waitFor(() => expect(JSON.parse(window.sessionStorage.getItem('churchhub.sessao')).token).not.toBe(tokenAntigo));
    // Continua logado: a próxima tela carrega com o token novo.
    fireEvent.click(screen.getAllByRole('link', { name: 'Eventos' })[0]);
    expect(await screen.findByRole('heading', { name: 'Eventos' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Entrar' })).toBeNull();
  });
});
