import { describe, expect, it } from 'vitest';
import { alternarOrdenacao, ariaSort, lerSort, ordenacaoParaSort } from './ordenacao';

describe('alternarOrdenacao', () => {
  it('na mesma coluna inverte a direção', () => {
    expect(alternarOrdenacao({ campo: 'nome', direcao: 'asc' }, 'nome')).toEqual({ campo: 'nome', direcao: 'desc' });
    expect(alternarOrdenacao({ campo: 'nome', direcao: 'desc' }, 'nome')).toEqual({ campo: 'nome', direcao: 'asc' });
  });

  it('em outra coluna começa crescente', () => {
    expect(alternarOrdenacao({ campo: 'nome', direcao: 'desc' }, 'email')).toEqual({ campo: 'email', direcao: 'asc' });
    expect(alternarOrdenacao(null, 'status')).toEqual({ campo: 'status', direcao: 'asc' });
  });
});

describe('sort do Spring', () => {
  it('converte nos dois sentidos', () => {
    expect(ordenacaoParaSort({ campo: 'email', direcao: 'desc' })).toBe('email,desc');
    expect(lerSort('email,DESC')).toEqual({ campo: 'email', direcao: 'desc' });
    expect(lerSort('nome')).toEqual({ campo: 'nome', direcao: 'asc' });
  });

  it('recusa formatos inválidos', () => {
    ['', null, ',asc', 'nome,cima', 'nome,asc,x'].forEach((texto) => expect(lerSort(texto)).toBeNull());
  });
});

describe('ariaSort', () => {
  it('marca só a coluna ordenada', () => {
    const ordenacao = { campo: 'nome', direcao: 'desc' };
    expect(ariaSort(ordenacao, 'nome')).toBe('descending');
    expect(ariaSort({ campo: 'nome', direcao: 'asc' }, 'nome')).toBe('ascending');
    expect(ariaSort(ordenacao, 'email')).toBe('none');
  });
});
