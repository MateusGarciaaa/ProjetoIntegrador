// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PERFIS } from '../constants/perfis';
import { renderizarComPerfil } from '../test-utils/componentes';
import { AppRoutes } from './AppRoutes';

function abrir(caminho, perfil) {
  return renderizarComPerfil(
    <MemoryRouter initialEntries={[caminho]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes />
    </MemoryRouter>,
    perfil,
  );
}

const menu = () => screen.getByRole('navigation', { name: 'Seções' });

describe('rotas por perfil', () => {
  it('MEMBRO entra direto em Eventos e só vê Eventos no menu', async () => {
    abrir('/', PERFIS.MEMBRO);
    expect(await screen.findByRole('heading', { name: 'Eventos' })).toBeTruthy();
    expect(menu().textContent).toBe('Eventos');
  });

  it('TESOUREIRO entra no Financeiro', async () => {
    abrir('/', PERFIS.TESOUREIRO);
    expect(await screen.findByRole('heading', { name: 'Financeiro' })).toBeTruthy();
  });

  it('URL de área não permitida mostra "Sem acesso", sem deslogar', async () => {
    abrir('/financeiro', PERFIS.MEMBRO);
    expect(await screen.findByRole('heading', { name: 'Sem acesso à área Financeiro' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /sair/i })).toBeTruthy();
  });

  it('breadcrumb leva ao início do perfil', async () => {
    abrir('/eventos', PERFIS.ADMINISTRADOR);
    await screen.findByRole('heading', { name: 'Eventos' });
    const trilha = screen.getByRole('navigation', { name: 'Trilha de navegação' });
    expect(trilha.querySelector('a').getAttribute('href')).toBe('/dashboard');
  });

  it('sem sessão, qualquer rota protegida vai para o login', async () => {
    abrir('/eventos', null);
    expect(await screen.findByRole('button', { name: /entrar/i })).toBeTruthy();
  });
});
