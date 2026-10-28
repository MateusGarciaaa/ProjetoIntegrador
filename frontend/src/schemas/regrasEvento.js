import { FUSO_HORARIO_SERVIDOR } from '../constants/eventos';
import { PERFIS } from '../constants/perfis';
import { PERMISSOES, temPermissao } from '../constants/permissoes';
import { agoraNoFuso, horarioComSegundos, isDataIsoValida } from '../utils/datas';

/** Mensagem exata da ConflictException (409) do EventoService.atualizar (RN09). */
export const MENSAGEM_RN09_BACKEND = 'Este evento já foi encerrado e só pode ser editado por um administrador';

/** Explicação mostrada a quem não pode editar um evento encerrado. */
export const MOTIVO_EVENTO_ENCERRADO = 'Este evento já foi encerrado. Somente um administrador pode editá-lo.';

/** "Agora" no fuso do servidor: { data: "AAAA-MM-DD", horario: "HH:mm:ss" }. */
export function agoraDoServidor(instante = new Date()) {
  return agoraNoFuso(FUSO_HORARIO_SERVIDOR, instante);
}

/**
 * Mesmo critério do EventoService.jaEncerrado: LocalDateTime.of(data, horario).isBefore(LocalDateTime.now(clock)),
 * com o Clock no fuso da igreja (APP_TIMEZONE, padrão America/Sao_Paulo).
 * Como não existe hora de término, o evento conta como encerrado a partir do horário de início.
 * Compara texto "AAAA-MM-DD HH:mm:ss" (ordem do texto = ordem do tempo). Com o mesmo segundo,
 * conta como encerrado: o now() do servidor tem frações de segundo e já estaria depois.
 */
export function isEventoEncerrado(evento, agora = agoraDoServidor()) {
  if (!evento || !isDataIsoValida(evento.data)) return false;
  const horario = horarioComSegundos(evento.horario);
  if (!horario) return false;
  return `${evento.data} ${horario}` <= `${agora.data} ${agora.horario}`;
}

/**
 * O que a interface faz com o botão "Editar" de um evento, para o perfil logado:
 *   visivel   → o perfil pode editar eventos (PUT /events/{id}: A e S);
 *   permitido → pode editar este evento agora (RN09: encerrado só o ADMINISTRADOR);
 *   motivo    → explicação quando visível mas bloqueado.
 * Só esconde ou desabilita: quem decide é o backend (409 com MENSAGEM_RN09_BACKEND).
 */
export function situacaoEdicaoEvento(perfil, evento, agora = agoraDoServidor()) {
  if (!temPermissao(perfil, PERMISSOES.EVENTOS_EDITAR)) return { visivel: false, permitido: false, motivo: null };
  if (perfil === PERFIS.ADMINISTRADOR || !isEventoEncerrado(evento, agora)) {
    return { visivel: true, permitido: true, motivo: null };
  }
  return { visivel: true, permitido: false, motivo: MOTIVO_EVENTO_ENCERRADO };
}

