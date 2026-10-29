import { describe, expect, it } from 'vitest';
import { itemMenuDoCaminho, itensMenuDoPerfil, trilhaDoCaminho } from './navegacao';
import { PERFIS } from './perfis';
import { temPermissao } from './permissoes';
import { rotaInicialDoPerfil, ROTAS } from './rotas';

const rotulos = (perfil) => itensMenuDoPerfil(perfil).map((item) => item.rotulo);

describe('menu por perfil', () => {
  it('mostra só as áreas que o backend libera', () => {
    expect(rotulos(PERFIS.ADMINISTRADOR)).toEqual(['Painel', 'Membros', 'Eventos', 'Financeiro']);
    expect(rotulos(PERFIS.PASTOR)).toEqual(['Painel', 'Membros', 'Eventos', 'Financeiro']);
    expect(rotulos(PERFIS.SECRETARIO)).toEqual(['Painel', 'Membros', 'Eventos']);
    expect(rotulos(PERFIS.TESOUREIRO)).toEqual(['Painel', 'Eventos', 'Financeiro']);
    expect(rotulos(PERFIS.MEMBRO)).toEqual(['Painel', 'Eventos']);
  });

  it('sem perfil, menu vazio', () => {
    expect(itensMenuDoPerfil(null)).toEqual([]);
  });
});

describe('rota inicial por perfil', () => {
  it('leva todos os perfis ao Painel (cada um vê só os seus blocos, RN12)', () => {
    expect(rotaInicialDoPerfil(PERFIS.ADMINISTRADOR)).toBe(ROTAS.DASHBOARD);
    expect(rotaInicialDoPerfil(PERFIS.PASTOR)).toBe(ROTAS.DASHBOARD);
    expect(rotaInicialDoPerfil(PERFIS.SECRETARIO)).toBe(ROTAS.DASHBOARD);
    expect(rotaInicialDoPerfil(PERFIS.TESOUREIRO)).toBe(ROTAS.DASHBOARD);
    expect(rotaInicialDoPerfil(PERFIS.MEMBRO)).toBe(ROTAS.DASHBOARD);
  });

  it('a rota inicial é sempre uma área que o perfil pode ver', () => {
    Object.values(PERFIS).forEach((perfil) => {
      const item = itemMenuDoCaminho(rotaInicialDoPerfil(perfil));
      expect(temPermissao(perfil, item.permissao)).toBe(true);
    });
  });
});

describe('itemMenuDoCaminho', () => {
  it('reconhece o caminho e seus subcaminhos', () => {
    expect(itemMenuDoCaminho('/membros').rotulo).toBe('Membros');
    expect(itemMenuDoCaminho('/membros/123').rotulo).toBe('Membros');
  });

  it('não confunde prefixos parecidos', () => {
    expect(itemMenuDoCaminho('/membrosx')).toBeNull();
    expect(itemMenuDoCaminho('/')).toBeNull();
  });
});

describe('trilhaDoCaminho', () => {
  it('monta "Início › Área" com o início do perfil', () => {
    expect(trilhaDoCaminho('/membros', PERFIS.ADMINISTRADOR)).toEqual([
      { rotulo: 'Início', caminho: '/dashboard' },
      { rotulo: 'Membros', caminho: '/membros' },
    ]);
  });

  it('subpáginas ganham um terceiro nível, sem repetir o início do perfil', () => {
    expect(trilhaDoCaminho('/membros/novo', PERFIS.ADMINISTRADOR)).toEqual([
      { rotulo: 'Início', caminho: '/dashboard' },
      { rotulo: 'Membros', caminho: '/membros' },
      { rotulo: 'Novo' },
    ]);
    expect(trilhaDoCaminho('/membros/abc/editar', PERFIS.SECRETARIO)).toEqual([
      { rotulo: 'Início', caminho: '/dashboard' },
      { rotulo: 'Membros', caminho: '/membros' },
      { rotulo: 'Editar' },
    ]);
    expect(trilhaDoCaminho('/membros/abc', PERFIS.PASTOR).at(-1)).toEqual({ rotulo: 'Detalhes' });
  });

  it('abas do Financeiro têm rótulo próprio', () => {
    expect(trilhaDoCaminho('/financeiro/fluxo-de-caixa', PERFIS.TESOUREIRO)).toEqual([
      { rotulo: 'Início', caminho: '/dashboard' },
      { rotulo: 'Financeiro', caminho: '/financeiro' },
      { rotulo: 'Fluxo de caixa' },
    ]);
    expect(trilhaDoCaminho('/financeiro/relatorio', PERFIS.PASTOR).at(-1)).toEqual({ rotulo: 'Relatório' });
    expect(trilhaDoCaminho('/financeiro/novo', PERFIS.TESOUREIRO).at(-1)).toEqual({ rotulo: 'Novo' });
    expect(trilhaDoCaminho('/financeiro/abc/editar', PERFIS.ADMINISTRADOR).at(-1)).toEqual({ rotulo: 'Editar' });
  });

  it('sem trilha na rota inicial do perfil e fora do menu', () => {
    expect(trilhaDoCaminho('/dashboard', PERFIS.SECRETARIO)).toEqual([]);
    expect(trilhaDoCaminho('/nao-existe', PERFIS.ADMINISTRADOR)).toEqual([]);
  });
});
