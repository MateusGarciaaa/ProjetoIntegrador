// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PERFIS } from '../constants/perfis';
import { abrirAppComServidor } from '../test-utils/app';
import { simularElementosVisiveis } from '../test-utils/layout';

simularElementosVisiveis();
let transporte;

afterEach(() => {
  transporte?.restaurar();
  transporte = null;
  window.sessionStorage.clear();
});

// O matchMedia de test-utils/componentes responde "não" a tudo: a tela é a de um celular.
describe('menu lateral no celular', () => {
  it('aberto, é um diálogo modal com o foco dentro; Esc fecha e devolve o foco ao botão', async () => {
    transporte = abrirAppComServidor('/minha-conta', PERFIS.MEMBRO).transporte;
    const botao = await screen.findByRole('button', { name: 'Abrir menu' });
    expect(screen.queryByRole('dialog', { name: 'Menu principal' })).toBeNull();

    botao.focus();
    fireEvent.click(botao);
    const menu = screen.getByRole('dialog', { name: 'Menu principal' });
    expect(menu.getAttribute('aria-modal')).toBe('true');
    expect(botao.getAttribute('aria-expanded')).toBe('true');
    expect(menu.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Menu principal' })).toBeNull();
    expect(document.activeElement).toBe(botao);
  });
});
