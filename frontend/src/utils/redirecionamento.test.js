import { describe, expect, it } from 'vitest';
import { PERFIS } from '../constants/perfis';
import { destinoAposLogin } from './redirecionamento';

describe('destinoAposLogin', () => {
  it('volta para a rota interna de origem', () => {
    expect(destinoAposLogin('/membros?pagina=2', PERFIS.SECRETARIO)).toBe('/membros?pagina=2');
  });

  it('sem origem válida, vai para a rota inicial do perfil', () => {
    expect(destinoAposLogin(undefined, PERFIS.MEMBRO)).toBe('/eventos');
    expect(destinoAposLogin(undefined, PERFIS.TESOUREIRO)).toBe('/financeiro');
  });

  it('ignora destinos externos, o próprio login e valores inválidos', () => {
    ['//evil.com', 'https://evil.com', '/login', undefined, 42].forEach((origem) =>
      expect(destinoAposLogin(origem, PERFIS.SECRETARIO)).toBe('/membros'),
    );
  });
});
