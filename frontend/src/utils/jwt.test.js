import { describe, expect, it } from 'vitest';
import { tokenCom } from '../test-utils/tokens';
import { decodificarPayloadJwt, lerUsuarioDoToken, removerPrefixoRole } from './jwt';

function base64Url(objeto) {
  return Buffer.from(JSON.stringify(objeto)).toString('base64url');
}

describe('removerPrefixoRole', () => {
  it('remove o prefixo ROLE_ do Spring Security', () => {
    expect(removerPrefixoRole('ROLE_ADMINISTRADOR')).toBe('ADMINISTRADOR');
    expect(removerPrefixoRole('ROLE_SECRETARIO')).toBe('SECRETARIO');
  });

  it('mantém valores sem prefixo e recusa vazios', () => {
    expect(removerPrefixoRole('PASTOR')).toBe('PASTOR');
    expect(removerPrefixoRole('ROLE_')).toBeNull();
    expect(removerPrefixoRole(undefined)).toBeNull();
  });
});

describe('decodificarPayloadJwt', () => {
  it('lê payload com caracteres acentuados (UTF-8 em base64url)', () => {
    expect(decodificarPayloadJwt(tokenCom({ sub: 'joão@igreja.org' })).sub).toBe('joão@igreja.org');
  });

  it('devolve null para tokens malformados', () => {
    ['', 'abc', 'a.b', 'a.!!!.c', `${base64Url({})}.${Buffer.from('[1]').toString('base64url')}.x`, null].forEach((token) =>
      expect(decodificarPayloadJwt(token)).toBeNull(),
    );
  });
});

describe('lerUsuarioDoToken', () => {
  it('extrai e-mail do sub, perfil sem prefixo e exp — as claims do JwtService', () => {
    const token = tokenCom({ sub: 'secretario@igreja.org', perfil: 'ROLE_SECRETARIO', iat: 1000, exp: 87400 });
    expect(lerUsuarioDoToken(token)).toEqual({
      email: 'secretario@igreja.org',
      nome: null,
      perfil: 'SECRETARIO',
      expiraEmSegundos: 87400,
    });
  });

  it('usa a claim nome se um dia ela existir', () => {
    const token = tokenCom({ sub: 'a@b.org', nome: ' Ana Souza ', perfil: 'ROLE_PASTOR', exp: 1 });
    expect(lerUsuarioDoToken(token).nome).toBe('Ana Souza');
  });

  it('exige a claim sub', () => {
    expect(lerUsuarioDoToken(tokenCom({ perfil: 'ROLE_PASTOR' }))).toBeNull();
  });
});
