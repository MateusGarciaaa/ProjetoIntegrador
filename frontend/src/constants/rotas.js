import { PERFIS } from './perfis';

export const ROTAS = Object.freeze({
  INICIO: '/',
  LOGIN: '/login',
  ESQUECI_SENHA: '/esqueci-senha',
  // Caminho do link gerado pelo backend (LoggingMailSender): /reset-password?token=<UUID>;
  // no convite de um usuário novo, com &convite=1 (só muda o texto da tela).
  REDEFINIR_SENHA: '/reset-password',
  DASHBOARD: '/dashboard',
  MEMBROS: '/membros',
  MEMBRO_NOVO: '/membros/novo',
  MEMBRO_DETALHES: '/membros/:id',
  MEMBRO_EDICAO: '/membros/:id/editar',
  EVENTOS: '/eventos',
  EVENTO_NOVO: '/eventos/novo',
  EVENTO_DETALHES: '/eventos/:id',
  EVENTO_EDICAO: '/eventos/:id/editar',
  FINANCEIRO: '/financeiro',
  FINANCEIRO_NOVO: '/financeiro/novo',
  FINANCEIRO_EDICAO: '/financeiro/:id/editar',
  FLUXO_DE_CAIXA: '/financeiro/fluxo-de-caixa',
  RELATORIO_FINANCEIRO: '/financeiro/relatorio',
  USUARIOS: '/usuarios',
  USUARIO_NOVO: '/usuarios/novo',
  USUARIO_EDICAO: '/usuarios/:id/editar',
  MINHA_CONTA: '/minha-conta',
});

/** Não há página de detalhes do usuário: a lista já mostra todos os campos. */
export function caminhoEdicaoUsuario(id) {
  return `${ROTAS.USUARIOS}/${encodeURIComponent(id)}/editar`;
}

export function caminhoDoMembro(id) {
  return `${ROTAS.MEMBROS}/${encodeURIComponent(id)}`;
}

export function caminhoEdicaoMembro(id) {
  return `${caminhoDoMembro(id)}/editar`;
}

export function caminhoDoEvento(id) {
  return `${ROTAS.EVENTOS}/${encodeURIComponent(id)}`;
}

export function caminhoEdicaoEvento(id) {
  return `${caminhoDoEvento(id)}/editar`;
}

/** Cadastro de evento com a data já preenchida (dia clicado no calendário). */
/** Não há página de detalhes da movimentação: a lista já mostra todos os campos. */
export function caminhoEdicaoMovimentacao(id) {
  return `${ROTAS.FINANCEIRO}/${encodeURIComponent(id)}/editar`;
}

export function caminhoNovoEvento(dataIso) {
  return dataIso ? `${ROTAS.EVENTO_NOVO}?data=${encodeURIComponent(dataIso)}` : ROTAS.EVENTO_NOVO;
}

/**
 * Primeira tela: o Painel, para todos os perfis (GET /dashboard é isAuthenticated() e cada perfil
 * recebe só os blocos que pode ver, RN12).
 */
const ROTA_INICIAL_POR_PERFIL = Object.freeze({
  [PERFIS.ADMINISTRADOR]: ROTAS.DASHBOARD,
  [PERFIS.PASTOR]: ROTAS.DASHBOARD,
  [PERFIS.SECRETARIO]: ROTAS.DASHBOARD,
  [PERFIS.TESOUREIRO]: ROTAS.DASHBOARD,
  [PERFIS.MEMBRO]: ROTAS.DASHBOARD,
});

/** Perfil desconhecido cai em Membros, que mostra "Sem acesso" com a explicação. */
export function rotaInicialDoPerfil(perfil) {
  return ROTA_INICIAL_POR_PERFIL[perfil] ?? ROTAS.MEMBROS;
}
