// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PERFIS } from '../constants/perfis';
import { SENHA_DEMO } from '../services/mock/contasDemo';
import { abrirAppComServidor } from '../test-utils/app';

let transporte;

afterEach(() => {
  transporte?.restaurar();
  transporte = null;
  window.sessionStorage.clear();
});

function abrir(perfil, opcoes) {
  const aberto = abrirAppComServidor('/minha-conta', perfil, opcoes);
  transporte = aberto.transporte;
  return aberto;
}

function trocar(atual, nova, confirmacao = nova) {
  fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: atual } });
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: nova } });
  fireEvent.change(screen.getByLabelText('Confirme a nova senha'), { target: { value: confirmacao } });
  fireEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));
}

describe('Minha conta', () => {
  it.each(Object.values(PERFIS))('%s vê os próprios dados, lidos do servidor', async (perfil) => {
    abrir(perfil);
    expect(await screen.findByRole('heading', { name: 'Minha conta' })).toBeTruthy();
    expect(await screen.findByText(`${perfil.toLowerCase()}@churchhub.local`, { selector: 'dd' })).toBeTruthy();
  });

  it('mostra nome e perfil do GET /me', async () => {
    abrir(PERFIS.MEMBRO);
    expect(await screen.findByText('Tiago Moreira', { selector: 'dd' })).toBeTruthy();
    expect(screen.getByText('Membro', { selector: 'dd' })).toBeTruthy();
  });

  it('senha atual errada aparece no campo e a sessão continua', async () => {
    const renovarSessao = vi.fn();
    abrir(PERFIS.PASTOR, { renovarSessao });
    await screen.findByLabelText('Senha atual');

    trocar('errada1', 'outraSenha1');

    expect(await screen.findByText('A senha atual está incorreta')).toBeTruthy();
    expect(screen.getByLabelText('Senha atual').getAttribute('aria-invalid')).toBe('true');
    expect(renovarSessao).not.toHaveBeenCalled();
  });

  it('nova senha igual à atual é recusada antes de chamar o servidor', async () => {
    abrir(PERFIS.PASTOR);
    await screen.findByLabelText('Senha atual');
    const chamadasAntes = transporte.adapter.mock.calls.length;

    trocar(SENHA_DEMO, SENHA_DEMO);

    expect(await screen.findByText('A nova senha deve ser diferente da atual.')).toBeTruthy();
    expect(transporte.adapter.mock.calls.length).toBe(chamadasAntes);
  });

  it('troca a senha, usa o token novo devolvido e limpa o formulário', async () => {
    const renovarSessao = vi.fn();
    abrir(PERFIS.TESOUREIRO, { renovarSessao });
    await screen.findByLabelText('Senha atual');

    trocar(SENHA_DEMO, 'senhaNova1');

    expect(await screen.findByText(/^Senha alterada\./)).toBeTruthy();
    expect(renovarSessao).toHaveBeenCalledWith(expect.objectContaining({ type: 'Bearer', token: expect.any(String) }));
    expect(screen.getByLabelText('Senha atual').value).toBe('');
    const enviado = transporte.adapter.mock.calls.map(([config]) => config).find((c) => c.url === '/me/password');
    expect(JSON.parse(enviado.data)).toEqual({ currentPassword: SENHA_DEMO, newPassword: 'senhaNova1' });
  });
});
