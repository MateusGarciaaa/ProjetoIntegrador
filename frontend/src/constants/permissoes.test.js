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
  [PERMISSOES.MEMBROS_VISUALIZAR]: [ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO],
  [PERMISSOES.MEMBROS_CRIAR]: [ADMINISTRADOR, SECRETARIO],
  [PERMISSOES.MEMBROS_EDITAR]: [ADMINISTRADOR, SECRETARIO],
  [PERMISSOES.MEMBROS_EXCLUIR]: [ADMINISTRADOR],
  // EventoController
  [PERMISSOES.EVENTOS_VISUALIZAR]: [ADMINISTRADOR, PASTOR, SECRETARIO, MEMBRO],
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
  // DashboardController (o bloco financeiro é regra do método, não do @PreAuthorize)
  [PERMISSOES.DASHBOARD_VISUALIZAR]: [ADMINISTRADOR, PASTOR],
  [PERMISSOES.DASHBOARD_FINANCEIRO]: [ADMINISTRADOR],
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

  it('PASTOR vê o financeiro, mas não o bloco financeiro do dashboard', () => {
    expect(temPermissao(PASTOR, PERMISSOES.FINANCEIRO_VISUALIZAR)).toBe(true);
    expect(temPermissao(PASTOR, PERMISSOES.DASHBOARD_FINANCEIRO)).toBe(false);
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
