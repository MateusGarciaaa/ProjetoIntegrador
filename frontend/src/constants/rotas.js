import { PERFIS } from './perfis';

export const ROTAS = Object.freeze({
  INICIO: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  MEMBROS: '/membros',
  EVENTOS: '/eventos',
  FINANCEIRO: '/financeiro',
});

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
