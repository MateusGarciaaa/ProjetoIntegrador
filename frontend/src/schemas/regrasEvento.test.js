import { describe, expect, it } from 'vitest';
import { PERFIS } from '../constants/perfis';
import {
  agoraDoServidor,
  isEventoEncerrado,
  MOTIVO_EVENTO_ENCERRADO,
  situacaoEdicaoEvento,
} from './regrasEvento';

const AGORA = { data: '2026-10-27', horario: '19:00:00' };
const PASSADO = { id: '1', titulo: 'Culto de ação de graças', data: '2026-10-20', horario: '19:00:00' };
const FUTURO = { id: '2', titulo: 'Conferência', data: '2026-11-26', horario: '19:00:00' };
const HOJE_MAIS_TARDE = { id: '3', titulo: 'Reunião de oração', data: '2026-10-27', horario: '20:00:00' };
const HOJE_MAIS_CEDO = { id: '4', titulo: 'EBD', data: '2026-10-27', horario: '09:00:00' };

describe('isEventoEncerrado: mesmo critério do EventoService (início já passou)', () => {
  it('passado e futuro', () => {
    expect(isEventoEncerrado(PASSADO, AGORA)).toBe(true);
    expect(isEventoEncerrado(FUTURO, AGORA)).toBe(false);
  });

  it('no mesmo dia, decide pelo horário', () => {
    expect(isEventoEncerrado(HOJE_MAIS_CEDO, AGORA)).toBe(true);
    expect(isEventoEncerrado(HOJE_MAIS_TARDE, AGORA)).toBe(false);
  });

  it('no minuto exato do início já conta como encerrado (o now() do servidor tem frações de segundo)', () => {
    expect(isEventoEncerrado({ ...FUTURO, data: '2026-10-27', horario: '19:00:00' }, AGORA)).toBe(true);
    expect(isEventoEncerrado({ ...FUTURO, data: '2026-10-27', horario: '19:00' }, AGORA)).toBe(true);
    expect(isEventoEncerrado({ ...FUTURO, data: '2026-10-27', horario: '19:00:01' }, AGORA)).toBe(false);
  });

  it('usa o relógio de São Paulo, não o do navegador', () => {
    // 01/11 às 01:00 UTC ainda é 31/10, 22:00, em São Paulo: um evento de 31/10 às 23:00 não começou.
    const agora = agoraDoServidor(new Date(Date.UTC(2026, 10, 1, 1, 0, 0)));
    expect(agora).toEqual({ data: '2026-10-31', horario: '22:00:00' });
    expect(isEventoEncerrado({ ...FUTURO, data: '2026-10-31', horario: '23:00:00' }, agora)).toBe(false);
    expect(isEventoEncerrado({ ...FUTURO, data: '2026-10-31', horario: '21:59:00' }, agora)).toBe(true);
  });

  it('evento sem data ou horário legível não é tratado como encerrado', () => {
    expect(isEventoEncerrado(null, AGORA)).toBe(false);
    expect(isEventoEncerrado({ data: null, horario: '19:00' }, AGORA)).toBe(false);
  });
});

describe('RN09 por perfil: situacaoEdicaoEvento', () => {
  const liberado = { visivel: true, permitido: true, motivo: null };
  const bloqueado = { visivel: true, permitido: false, motivo: MOTIVO_EVENTO_ENCERRADO };
  const oculto = { visivel: false, permitido: false, motivo: null };

  it('ADMINISTRADOR edita qualquer evento, inclusive encerrado', () => {
    expect(situacaoEdicaoEvento(PERFIS.ADMINISTRADOR, FUTURO, AGORA)).toEqual(liberado);
    expect(situacaoEdicaoEvento(PERFIS.ADMINISTRADOR, PASSADO, AGORA)).toEqual(liberado);
  });

  it('SECRETARIO edita evento futuro; o encerrado aparece bloqueado, com o motivo', () => {
    expect(situacaoEdicaoEvento(PERFIS.SECRETARIO, FUTURO, AGORA)).toEqual(liberado);
    expect(situacaoEdicaoEvento(PERFIS.SECRETARIO, HOJE_MAIS_TARDE, AGORA)).toEqual(liberado);
    expect(situacaoEdicaoEvento(PERFIS.SECRETARIO, PASSADO, AGORA)).toEqual(bloqueado);
    expect(situacaoEdicaoEvento(PERFIS.SECRETARIO, HOJE_MAIS_CEDO, AGORA)).toEqual(bloqueado);
  });

  it('PASTOR, MEMBRO e TESOUREIRO não editam evento nenhum (o botão nem aparece)', () => {
    [PERFIS.PASTOR, PERFIS.MEMBRO, PERFIS.TESOUREIRO, null].forEach((perfil) => {
      expect(situacaoEdicaoEvento(perfil, FUTURO, AGORA)).toEqual(oculto);
      expect(situacaoEdicaoEvento(perfil, PASSADO, AGORA)).toEqual(oculto);
    });
  });
});
