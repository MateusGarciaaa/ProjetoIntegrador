import { describe, expect, it } from 'vitest';
import { PERFIS } from './perfis';
import { PERMISSOES, perfisComPermissao, temPermissao } from './permissoes';

const { ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO, MEMBRO } = PERFIS;

/**
 * Transcrição independente dos @PreAuthorize de todos os controllers.
 * Se o backend mudar, este teste deve mudar junto.
 */
const ESPERADO = {
  // MembroController
  [PERMISSOES.MEMBROS_VISUALIZAR]: [ADMINISTRADOR, PASTOR, SECRETARIO],
  [PERMISSOES.MEMBROS_CRIAR]: [ADMINISTRADOR, SECRETARIO],
  [PERMISSOES.MEMBROS_EDITAR]: [ADMINISTRADOR, SECRETARIO],
  [PERMISSOES.MEMBROS_EXCLUIR]: [ADMINISTRADOR],
  [PERMISSOES.MEMBROS_BUSCAR]: [ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO],
  // EventoController
  [PERMISSOES.EVENTOS_VISUALIZAR]: [ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO, MEMBRO], // isAuthenticated()
  [PERMISSOES.EVENTOS_CRIAR]: [ADMINISTRADOR, SECRETARIO],
  [PERMISSOES.EVENTOS_EDITAR]: [ADMINISTRADOR, SECRETARIO],
  [PERMISSOES.EVENTOS_EXCLUIR]: [ADMINISTRADOR],
  // MovimentacaoFinanceiraController
  [PERMISSOES.FINANCEIRO_VISUALIZAR]: [ADMINISTRADOR, PASTOR, TESOUREIRO],
  [PERMISSOES.FINANCEIRO_CRIAR]: [ADMINISTRADOR, TESOUREIRO],
  [PERMISSOES.FINANCEIRO_EDITAR]: [ADMINISTRADOR, TESOUREIRO],
  [PERMISSOES.FINANCEIRO_EXCLUIR]: [ADMINISTRADOR],
  // CategoriaFinanceiraController
  [PERMISSOES.CATEGORIAS_VISUALIZAR]: [ADMINISTRADOR, PASTOR, TESOUREIRO],
  [PERMISSOES.CATEGORIAS_CRIAR]: [ADMINISTRADOR, TESOUREIRO],
  // DashboardController: isAuthenticated(); os blocos seguem VisibilidadeDashboard (regra do método)
  [PERMISSOES.DASHBOARD_VISUALIZAR]: [ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO, MEMBRO],
  [PERMISSOES.DASHBOARD_MEMBROS]: [ADMINISTRADOR, PASTOR, SECRETARIO],
  [PERMISSOES.DASHBOARD_FINANCEIRO]: [ADMINISTRADOR, PASTOR, TESOUREIRO],
};

describe('matriz de permissões', () => {
  it('cobre todas as permissões declaradas', () => {
    expect(Object.keys(ESPERADO).sort()).toEqual(Object.values(PERMISSOES).sort());
  });

  Object.entries(ESPERADO).forEach(([permissao, permitidos]) => {
    Object.values(PERFIS).forEach((perfil) => {
      const deve = permitidos.includes(perfil);
      it(`${perfil} ${deve ? 'pode' : 'não pode'} ${permissao}`, () => {
        expect(temPermissao(perfil, permissao)).toBe(deve);
      });
    });
  });

  it('TESOUREIRO só busca membros (id, nome, status); a ficha completa não é dele', () => {
    expect(temPermissao(TESOUREIRO, PERMISSOES.MEMBROS_BUSCAR)).toBe(true);
    expect(temPermissao(TESOUREIRO, PERMISSOES.MEMBROS_VISUALIZAR)).toBe(false);
  });

  it('RN12: os blocos do dashboard seguem as permissões dos módulos de origem', () => {
    Object.values(PERFIS).forEach((perfil) => {
      expect(temPermissao(perfil, PERMISSOES.DASHBOARD_FINANCEIRO)).toBe(temPermissao(perfil, PERMISSOES.FINANCEIRO_VISUALIZAR));
      expect(temPermissao(perfil, PERMISSOES.DASHBOARD_MEMBROS)).toBe(temPermissao(perfil, PERMISSOES.MEMBROS_VISUALIZAR));
    });
  });

  it('perfil ausente, desconhecido ou permissão inexistente nunca liberam', () => {
    expect(temPermissao(null, PERMISSOES.MEMBROS_VISUALIZAR)).toBe(false);
    expect(temPermissao('ROLE_ADMINISTRADOR', PERMISSOES.MEMBROS_VISUALIZAR)).toBe(false);
    expect(temPermissao(ADMINISTRADOR, 'usuarios.visualizar')).toBe(false);
  });

  it('lista os perfis de uma permissão', () => {
    expect(perfisComPermissao(PERMISSOES.MEMBROS_EXCLUIR)).toEqual([ADMINISTRADOR]);
    expect(perfisComPermissao('inexistente')).toEqual([]);
  });
});
