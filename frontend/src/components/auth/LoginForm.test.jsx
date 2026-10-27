// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../../contexts/AuthProvider';
import { AppRoutes } from '../../routes/AppRoutes';
import '../../test-utils/componentes';
import { tokenCom } from '../../test-utils/tokens';
import { corpoApi, instalarTransporte, resposta } from '../../test-utils/transporte';

const SENHA = 'demo123';
let transporte;

afterEach(() => {
  transporte?.restaurar();
  window.sessionStorage.clear();
});

function respostaDeLogin(perfil) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = tokenCom({ sub: `${perfil.toLowerCase()}@churchhub.local`, perfil: `ROLE_${perfil}`, exp });
  return resposta(200, { token, type: 'Bearer', expiresIn: 3600 });
}

function abrir(caminho) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[caminho]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>,
  );
}

async function preencherEEnviar(email, senha) {
  fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('login', () => {
  it('com sucesso, volta para a rota que o usuário tentou acessar', async () => {
    transporte = instalarTransporte(respostaDeLogin('MEMBRO'));
    abrir('/eventos');

    await preencherEEnviar('  Membro@ChurchHub.local ', SENHA);

    expect(await screen.findByRole('heading', { name: 'Eventos' })).toBeTruthy();
    expect(transporte.corpoEnviado()).toEqual({ email: 'membro@churchhub.local', password: SENHA });
    // A sessão guarda só token e expiração: nunca a senha.
    const salvo = window.sessionStorage.getItem('churchhub.sessao');
    expect(Object.keys(JSON.parse(salvo)).sort()).toEqual(['expiresAt', 'token']);
    expect(salvo).not.toContain(SENHA);
  });

  it('sem rota de origem, o Administrador vai para o Painel', async () => {
    transporte = instalarTransporte(respostaDeLogin('ADMINISTRADOR'));
    abrir('/login');

    await preencherEEnviar('administrador@churchhub.local', SENHA);

    expect(await screen.findByRole('heading', { name: 'Painel' })).toBeTruthy();
  });

  it('com credenciais erradas, mostra a mensagem genérica sem apontar o campo', async () => {
    transporte = instalarTransporte(resposta(401, corpoApi(401, 'E-mail ou senha inválidos', '/api/v1/auth/login')));
    abrir('/login');

    await preencherEEnviar('secretario@churchhub.local', 'errada');

    expect((await screen.findByRole('alert')).textContent).toBe('E-mail ou senha inválidos');
    expect(screen.getByLabelText('E-mail').getAttribute('aria-invalid')).toBeNull();
    expect(screen.getByLabelText('Senha').getAttribute('aria-invalid')).toBeNull();
    expect(window.sessionStorage.getItem('churchhub.sessao')).toBeNull();
  });

  it('valida no cliente e não chama a API com e-mail inválido ou senha vazia', async () => {
    transporte = instalarTransporte(respostaDeLogin('MEMBRO'));
    abrir('/login');

    await preencherEEnviar('nao-e-email', '   ');

    expect(screen.getByText('Informe um e-mail válido, como nome@igreja.org.')).toBeTruthy();
    expect(screen.getByText('Informe sua senha.')).toBeTruthy();
    expect(transporte.adapter).not.toHaveBeenCalled();
  });

  it('bloqueia o envio duplo enquanto a primeira tentativa está em andamento', async () => {
    let concluir;
    transporte = instalarTransporte((config) => new Promise((resolve) => (concluir = () => resolve(respostaDeLogin('MEMBRO')(config)))));
    abrir('/login');

    await preencherEEnviar('membro@churchhub.local', SENHA);
    const formulario = screen.getByRole('button', { name: /entrando/i }).closest('form');
    fireEvent.submit(formulario);
    fireEvent.submit(formulario);

    await waitFor(() => expect(transporte.adapter).toHaveBeenCalled());
    concluir();
    expect(await screen.findByRole('heading', { name: 'Eventos' })).toBeTruthy();
    expect(transporte.adapter).toHaveBeenCalledTimes(1);
  });

  it('"Sair" limpa a sessão e o próximo login não volta para a tela anterior', async () => {
    transporte = instalarTransporte(respostaDeLogin('MEMBRO'));
    abrir('/eventos');
    await preencherEEnviar('membro@churchhub.local', SENHA);
    await screen.findByRole('heading', { name: 'Eventos' });

    fireEvent.click(screen.getByRole('button', { name: /sair/i }));

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeTruthy();
    expect(window.sessionStorage.getItem('churchhub.sessao')).toBeNull();
  });
});
