import { describe, expect, it } from 'vitest';
import { exibirTelefone, formatarTelefone } from './telefone';

describe('formatarTelefone', () => {
  it.each([
    ['', ''],
    ['4', '(4'],
    ['45', '(45'],
    ['459', '(45) 9'],
    ['4532241876', '(45) 3224-1876'],
    ['45999120341', '(45) 99912-0341'],
    ['459991203419999', '(45) 99912-0341'],
  ])('%s → %s', (entrada, esperado) => {
    expect(formatarTelefone(entrada)).toBe(esperado);
  });
});

describe('exibirTelefone', () => {
  it('formata números completos e preserva formatos desconhecidos', () => {
    expect(exibirTelefone('45999120341')).toBe('(45) 99912-0341');
    expect(exibirTelefone('+1 555 0100')).toBe('+1 555 0100');
    expect(exibirTelefone(null)).toBeNull();
  });
});
