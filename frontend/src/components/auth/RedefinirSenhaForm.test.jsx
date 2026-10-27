// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { RedefinirSenhaPage } from '../../pages/RedefinirSenhaPage';
import { MENSAGEM_TOKEN_INVALIDO } from '../../schemas/senhaSchema';
import '../../test-utils/componentes';
import { corpoApi, instalarTransporte, resposta } from '../../test-utils/transporte';

const CAMINHO = '/api/v1/auth/reset-password';
const TOKEN = '6f1c2b8e-3d4a-4f5b-9c7d-1e2f3a4b5c6d';
let transporte;

afterEach(() => transporte?.restaurar());

function abrir(url) {
  return render(
    <MemoryRouter initialEntries={[url]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RedefinirSenhaPage />
    </MemoryRouter>,
  );
}

function enviar(novaSenha, confirmacao = novaSenha) {
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: novaSenha } });
  fireEvent.change(screen.getByLabelText('Confirme a nova senha'), { target: { value: confirmacao } });
  fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }));
}

describe('redefinir senha', () => {
  it('token inválido ou expirado: mensagem clara e link para pedir outro', async () => {
    transporte = instalarTransporte(resposta(400, corpoApi(400, 'Token de redefinição inválido ou expirado', CAMINHO)));
    abrir(`/reset-password?token=${TOKEN}`);

    enviar('novaSenha1');

    expect((await screen.findByRole('alert')).textContent).toBe(MENSAGEM_TOKEN_INVALIDO);
    expect(screen.getByRole('link', { name: 'Pedir um novo link' }).getAttribute('href')).toBe('/esqueci-senha');
    expect(screen.queryByLabelText('Nova senha')).toBeNull();
    expect(transporte.corpoEnviado()).toEqual({ token: TOKEN, newPassword: 'novaSenha1' });
  });

  it('link sem token já mostra a mensagem de link inválido, sem chamar a API', () => {
    transporte = instalarTransporte(resposta(204));
    abrir('/reset-password');

    expect(screen.getByRole('alert').textContent).toBe(MENSAGEM_TOKEN_INVALIDO);
    expect(screen.getByRole('link', { name: 'Pedir um novo link' })).toBeTruthy();
    expect(transporte.adapter).not.toHaveBeenCalled();
  });

  it('confirmação diferente ou senha curta não chegam à API', () => {
    transporte = instalarTransporte(resposta(204));
    abrir(`/reset-password?token=${TOKEN}`);

    enviar('12345', 'outra');

    expect(screen.getByText('A senha deve ter entre 6 e 72 caracteres.')).toBeTruthy();
    expect(screen.getByText('As senhas não coincidem.')).toBeTruthy();
    expect(transporte.adapter).not.toHaveBeenCalled();
  });

  it('204: confirma a troca e leva ao login', async () => {
    transporte = instalarTransporte(resposta(204));
    abrir(`/reset-password?token=${TOKEN}`);

    enviar('novaSenha1');

    expect((await screen.findByRole('status')).textContent).toBe('Senha redefinida. Entre com a nova senha.');
    expect(screen.getByRole('link', { name: 'Ir para o login' }).getAttribute('href')).toBe('/login');
  });

  it('400 de validação da senha aparece no campo, não como token inválido', async () => {
    transporte = instalarTransporte(resposta(400, corpoApi(400, 'A nova senha deve ter entre 6 e 72 caracteres', CAMINHO)));
    abrir(`/reset-password?token=${TOKEN}`);

    enviar('novaSenha1');

    expect(await screen.findByText('A nova senha deve ter entre 6 e 72 caracteres')).toBeTruthy();
    expect(screen.getByLabelText('Nova senha').getAttribute('aria-invalid')).toBe('true');
  });
});
