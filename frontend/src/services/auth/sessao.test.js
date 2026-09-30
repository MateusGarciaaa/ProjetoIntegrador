import { describe, expect, it } from 'vitest';
import { tokenCom } from '../../test-utils/tokens';
import { criarSessao, isSessaoExpirada, MARGEM_EXPIRACAO_MS, restaurarSessao, tempoRestanteMs } from './sessao';

const AGORA = 1_700_000_000_000;
const AGORA_S = AGORA / 1000;

describe('criarSessao', () => {
  it('usa expiresIn (segundos) e lê o usuário do token', () => {
    const token = tokenCom({ sub: 'a@b.org', perfil: 'ROLE_PASTOR', iat: AGORA_S, exp: AGORA_S + 86400 });
    expect(criarSessao({ token, type: 'Bearer', expiresIn: 86400 }, AGORA)).toEqual({
      token,
      expiresAt: AGORA + 86_400_000,
      usuario: { email: 'a@b.org', nome: null, perfil: 'PASTOR' },
    });
  });

  it('fica com o menor prazo entre expiresIn e a claim exp', () => {
    const token = tokenCom({ sub: 'a@b.org', perfil: 'ROLE_PASTOR', exp: AGORA_S + 60 });
    expect(criarSessao({ token, expiresIn: 86400 }, AGORA).expiresAt).toBe(AGORA + 60_000);
  });

  it('recusa token ilegível', () => {
    expect(criarSessao({ token: 'lixo', expiresIn: 60 }, AGORA)).toBeNull();
    expect(criarSessao(undefined, AGORA)).toBeNull();
  });
});

describe('expiração', () => {
  const sessao = { expiresAt: AGORA + 60_000 };

  it('considera a margem de segurança', () => {
    expect(isSessaoExpirada(sessao, AGORA)).toBe(false);
    expect(isSessaoExpirada(sessao, AGORA + 60_000 - MARGEM_EXPIRACAO_MS)).toBe(true);
    expect(isSessaoExpirada(null, AGORA)).toBe(true);
    expect(tempoRestanteMs(sessao, AGORA)).toBe(60_000 - MARGEM_EXPIRACAO_MS);
    expect(tempoRestanteMs(sessao, AGORA + 120_000)).toBe(0);
  });

  it('ao restaurar, relê o token em vez de confiar no que estava salvo', () => {
    const token = tokenCom({ sub: 'a@b.org', perfil: 'ROLE_MEMBRO', exp: AGORA_S + 30 });
    const restaurada = restaurarSessao({ token, expiresAt: AGORA + 999_999, usuario: { perfil: 'ADMINISTRADOR' } });
    expect(restaurada.usuario.perfil).toBe('MEMBRO');
    expect(restaurada.expiresAt).toBe(AGORA + 30_000);
    expect(restaurarSessao({ token })).toBeNull();
  });
});
