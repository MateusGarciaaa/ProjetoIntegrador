import { PERFIS } from './perfis';

export const PERMISSOES = Object.freeze({
  MEMBROS_VISUALIZAR: 'membros.visualizar',
  MEMBROS_CRIAR: 'membros.criar',
  MEMBROS_EDITAR: 'membros.editar',
  MEMBROS_EXCLUIR: 'membros.excluir',
  MEMBROS_BUSCAR: 'membros.buscar',
  EVENTOS_VISUALIZAR: 'eventos.visualizar',
  EVENTOS_CRIAR: 'eventos.criar',
  EVENTOS_EDITAR: 'eventos.editar',
  EVENTOS_EXCLUIR: 'eventos.excluir',
  FINANCEIRO_VISUALIZAR: 'financeiro.visualizar',
  FINANCEIRO_CRIAR: 'financeiro.criar',
  FINANCEIRO_EDITAR: 'financeiro.editar',
  FINANCEIRO_EXCLUIR: 'financeiro.excluir',
  CATEGORIAS_VISUALIZAR: 'categorias.visualizar',
  CATEGORIAS_CRIAR: 'categorias.criar',
  DASHBOARD_VISUALIZAR: 'dashboard.visualizar',
  DASHBOARD_FINANCEIRO: 'dashboard.financeiro',
});

const { ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO, MEMBRO } = PERFIS;

/**
 * Espelho exato dos @PreAuthorize dos controllers, linha a linha.
 * Serve apenas para esconder ações na interface: quem autoriza é o backend.
 * Ao mudar um controller, mude aqui e em permissoes.test.js.
 */
const MATRIZ = Object.freeze({
  // MembroController
  [PERMISSOES.MEMBROS_VISUALIZAR]: [ADMINISTRADOR, PASTOR, SECRETARIO], // GET /members e /members/{id} (ficha completa)
  [PERMISSOES.MEMBROS_CRIAR]: [ADMINISTRADOR, SECRETARIO], // POST /members
  [PERMISSOES.MEMBROS_EDITAR]: [ADMINISTRADOR, SECRETARIO], // PUT /members/{id}
  [PERMISSOES.MEMBROS_EXCLUIR]: [ADMINISTRADOR], // DELETE /members/{id}
  [PERMISSOES.MEMBROS_BUSCAR]: [ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO], // GET /members/lookup (id, nome, status)

  // EventoController
  // GET /events e /events/{id}: isAuthenticated() — a agenda não é sensível, todo perfil consulta.
  [PERMISSOES.EVENTOS_VISUALIZAR]: [ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO, MEMBRO],
  [PERMISSOES.EVENTOS_CRIAR]: [ADMINISTRADOR, SECRETARIO], // POST /events
  [PERMISSOES.EVENTOS_EDITAR]: [ADMINISTRADOR, SECRETARIO], // PUT /events/{id} (RN09: evento encerrado só A; 409 para S)
  [PERMISSOES.EVENTOS_EXCLUIR]: [ADMINISTRADOR], // DELETE /events/{id}

  // MovimentacaoFinanceiraController
  [PERMISSOES.FINANCEIRO_VISUALIZAR]: [ADMINISTRADOR, TESOUREIRO, PASTOR], // GET /financial, /{id}, /summary
  [PERMISSOES.FINANCEIRO_CRIAR]: [ADMINISTRADOR, TESOUREIRO], // POST /financial
  [PERMISSOES.FINANCEIRO_EDITAR]: [ADMINISTRADOR, TESOUREIRO], // PUT /financial/{id}
  [PERMISSOES.FINANCEIRO_EXCLUIR]: [ADMINISTRADOR], // DELETE /financial/{id}

  // CategoriaFinanceiraController
  [PERMISSOES.CATEGORIAS_VISUALIZAR]: [ADMINISTRADOR, TESOUREIRO, PASTOR], // GET /financial-categories
  [PERMISSOES.CATEGORIAS_CRIAR]: [ADMINISTRADOR, TESOUREIRO], // POST /financial-categories

  // DashboardController
  [PERMISSOES.DASHBOARD_VISUALIZAR]: [ADMINISTRADOR, PASTOR], // GET /dashboard
  // Não é @PreAuthorize: o controller só preenche resumoFinanceiroMesAtual para ROLE_ADMINISTRADOR.
  [PERMISSOES.DASHBOARD_FINANCEIRO]: [ADMINISTRADOR],
});

export function temPermissao(perfil, permissao) {
  return Boolean(perfil) && (MATRIZ[permissao] ?? []).includes(perfil);
}

export function perfisComPermissao(permissao) {
  return MATRIZ[permissao] ?? [];
}
