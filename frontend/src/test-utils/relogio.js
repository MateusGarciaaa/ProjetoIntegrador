import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Instante fixo de todos os testes: terça-feira, 20/10/2026, 12:00 em São Paulo. Os dados de
 * demonstração (eventos, lançamentos e aniversários) são relativos a "hoje"; no dia 20 os 11
 * lançamentos do mês caem cada um no seu dia (o maior é o dia 15), sem colidir com o fim do mês.
 */
export const AGORA_DOS_TESTES = '2026-10-20T15:00:00.000Z';

/**
 * Muda o "agora" só do teste atual (o próximo volta para AGORA_DOS_TESTES).
 * Ex.: fixarAgora('2026-11-03T15:00:00Z') para conferir o comportamento no começo do mês.
 */
export function fixarAgora(instante) {
  vi.setSystemTime(new Date(instante));
}

// Só o Date é falso: setTimeout/setInterval continuam reais (findBy*, waitFor e a expiração da
// sessão funcionam como no navegador), e o relógio avança junto com o tempo real.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true, now: new Date(AGORA_DOS_TESTES) });
});

afterEach(() => {
  vi.useRealTimers();
});
