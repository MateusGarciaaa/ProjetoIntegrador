import { describe, expect, it } from 'vitest';
import { destinoAposLogin } from './redirecionamento';

describe('destinoAposLogin', () => {
  it('volta para a rota interna de origem', () => {
    expect(destinoAposLogin('/membros?pagina=2')).toBe('/membros?pagina=2');
  });

  it('ignora destinos externos, o próprio login e valores inválidos', () => {
    ['//evil.com', 'https://evil.com', '/login', undefined, 42].forEach((origem) =>
      expect(destinoAposLogin(origem)).toBe('/membros'),
    );
  });
});
