import { PERFIS } from './perfis';

export const PERMISSOES = Object.freeze({
  MEMBROS_VISUALIZAR: 'membros.visualizar',
  MEMBROS_CRIAR: 'membros.criar',
  MEMBROS_EDITAR: 'membros.editar',
  MEMBROS_EXCLUIR: 'membros.excluir',
});

const { ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO } = PERFIS;

/**
 * Espelho exato dos @PreAuthorize do MembroController.
 * Serve apenas para esconder ações na interface: quem autoriza é o backend.
 * Ao criar um módulo novo (eventos, finanças...), acrescente as permissões aqui.
 */
const MATRIZ = Object.freeze({
  [PERMISSOES.MEMBROS_VISUALIZAR]: [ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO], // GET /members e /members/{id}
  [PERMISSOES.MEMBROS_CRIAR]: [ADMINISTRADOR, SECRETARIO], // POST /members
  [PERMISSOES.MEMBROS_EDITAR]: [ADMINISTRADOR, SECRETARIO], // PUT /members/{id}
  [PERMISSOES.MEMBROS_EXCLUIR]: [ADMINISTRADOR], // DELETE /members/{id}
});

export function temPermissao(perfil, permissao) {
  return Boolean(perfil) && (MATRIZ[permissao] ?? []).includes(perfil);
}

export function perfisComPermissao(permissao) {
  return MATRIZ[permissao] ?? [];
}
