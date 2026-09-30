import { describe, expect, it } from 'vitest';
import { PERFIS } from './perfis';
import { PERMISSOES, perfisComPermissao, temPermissao } from './permissoes';

const { ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO, MEMBRO } = PERFIS;

/** Transcrição dos @PreAuthorize do MembroController. Se o backend mudar, este teste deve mudar junto. */
const ESPERADO = {
  [PERMISSOES.MEMBROS_VISUALIZAR]: [ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO],
  [PERMISSOES.MEMBROS_CRIAR]: [ADMINISTRADOR, SECRETARIO],
  [PERMISSOES.MEMBROS_EDITAR]: [ADMINISTRADOR, SECRETARIO],
  [PERMISSOES.MEMBROS_EXCLUIR]: [ADMINISTRADOR],
};

describe('matriz de permissões', () => {
  Object.entries(ESPERADO).forEach(([permissao, permitidos]) => {
    Object.values(PERFIS).forEach((perfil) => {
      const deve = permitidos.includes(perfil);
      it(`${perfil} ${deve ? 'pode' : 'não pode'} ${permissao}`, () => {
        expect(temPermissao(perfil, permissao)).toBe(deve);
      });
    });
  });

  it('MEMBRO não tem nenhuma permissão sobre membros', () => {
    Object.values(PERMISSOES).forEach((permissao) => expect(temPermissao(MEMBRO, permissao)).toBe(false));
  });

  it('perfil ausente, desconhecido ou permissão inexistente nunca liberam', () => {
    expect(temPermissao(null, PERMISSOES.MEMBROS_VISUALIZAR)).toBe(false);
    expect(temPermissao('ROLE_ADMINISTRADOR', PERMISSOES.MEMBROS_VISUALIZAR)).toBe(false);
    expect(temPermissao(ADMINISTRADOR, 'financas.visualizar')).toBe(false);
  });

  it('lista os perfis de uma permissão', () => {
    expect(perfisComPermissao(PERMISSOES.MEMBROS_EXCLUIR)).toEqual([ADMINISTRADOR]);
    expect(perfisComPermissao('inexistente')).toEqual([]);
  });
});
