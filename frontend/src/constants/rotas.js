import { PERFIS } from './perfis';

export const ROTAS = Object.freeze({
  INICIO: '/',
  LOGIN: '/login',
  ESQUECI_SENHA: '/esqueci-senha',
  // Caminho do link gerado pelo backend (LoggingMailSender): /reset-password?token=<UUID>.
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
});

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
export function caminhoNovoEvento(dataIso) {
  return dataIso ? `${ROTAS.EVENTO_NOVO}?data=${encodeURIComponent(dataIso)}` : ROTAS.EVENTO_NOVO;
}

/**
 * Primeira tela de cada perfil: a área mais usada entre as que o backend libera para ele
 * (o dashboard só existe para A e P; MEMBRO só pode ver eventos).
 */
const ROTA_INICIAL_POR_PERFIL = Object.freeze({
  [PERFIS.ADMINISTRADOR]: ROTAS.DASHBOARD,
  [PERFIS.PASTOR]: ROTAS.DASHBOARD,
  [PERFIS.SECRETARIO]: ROTAS.MEMBROS,
  [PERFIS.TESOUREIRO]: ROTAS.FINANCEIRO,
  [PERFIS.MEMBRO]: ROTAS.EVENTOS,
});

/** Perfil desconhecido cai em Membros, que mostra "Sem acesso" com a explicação. */
export function rotaInicialDoPerfil(perfil) {
  return ROTA_INICIAL_POR_PERFIL[perfil] ?? ROTAS.MEMBROS;
}
