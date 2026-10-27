// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { MENSAGEM_NEUTRA_ESQUECI } from '../../schemas/senhaSchema';
import '../../test-utils/componentes';
import { corpoApi, falhaDeRede, instalarTransporte, resposta } from '../../test-utils/transporte';
import { EsqueciSenhaForm } from './EsqueciSenhaForm';

const CAMINHO = '/api/v1/auth/forgot-password';
let transporte;

afterEach(() => transporte?.restaurar());

function abrir() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <EsqueciSenhaForm />
    </MemoryRouter>,
  );
}

function enviar(email) {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
}

describe('esqueci minha senha', () => {
  it.each([
    ['200 (resposta normal do backend)', resposta(200, { message: 'Se o e-mail existir em nossa base, um link de redefinição foi enviado.' })],
    ['400', resposta(400, corpoApi(400, 'E-mail inválido', CAMINHO))],
    ['404', resposta(404, corpoApi(404, 'Recurso não encontrado.', CAMINHO))],
    ['500', resposta(500, corpoApi(500, 'Ocorreu um erro interno no servidor.', CAMINHO))],
    ['falha de rede', falhaDeRede()],
  ])('mostra sempre a mesma mensagem neutra — %s', async (_caso, responder) => {
    transporte = instalarTransporte(responder);
    abrir();

    enviar('qualquer@igreja.org');

    const aviso = await screen.findByRole('status');
    expect(aviso.textContent).toBe(MENSAGEM_NEUTRA_ESQUECI);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByLabelText('E-mail')).toBeNull();
  });

  it('envia o e-mail sem espaços e em minúsculas (o backend busca exatamente como recebe)', async () => {
    transporte = instalarTransporte(resposta(200, { message: 'ok' }));
    abrir();

    enviar('  Secretario@ChurchHub.LOCAL ');

    await screen.findByRole('status');
    expect(transporte.corpoEnviado()).toEqual({ email: 'secretario@churchhub.local' });
  });

  it('não chama a API com e-mail inválido', () => {
    transporte = instalarTransporte(resposta(200, { message: 'ok' }));
    abrir();

    enviar('sem-arroba');

    expect(screen.getByText('Informe um e-mail válido, como nome@igreja.org.')).toBeTruthy();
    expect(transporte.adapter).not.toHaveBeenCalled();
  });
});
