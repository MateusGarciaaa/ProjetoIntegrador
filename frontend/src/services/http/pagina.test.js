import { describe, expect, it } from 'vitest';
import { ApiError, TIPOS_ERRO } from './apiError';
import { faixaDaPagina, montarParametrosPagina, normalizarPagina, TAMANHO_MAXIMO_PAGINA } from './pagina';

const membros = [{ id: '1' }, { id: '2' }];
const ESPERADO = { content: membros, number: 1, size: 10, totalElements: 12, totalPages: 2 };

describe('normalizarPagina', () => {
  it('aceita o formato DIRECT (PageImpl serializado)', () => {
    const bruta = {
      content: membros,
      pageable: { pageNumber: 1, pageSize: 10 },
      totalElements: 12,
      totalPages: 2,
      number: 1,
      size: 10,
      first: false,
      last: true,
    };
    expect(normalizarPagina(bruta)).toEqual(ESPERADO);
  });

  it('aceita o formato VIA_DTO ({ content, page })', () => {
    const bruta = { content: membros, page: { size: 10, number: 1, totalElements: 12, totalPages: 2 } };
    expect(normalizarPagina(bruta)).toEqual(ESPERADO);
  });

  it('completa metadados ausentes a partir do conteúdo', () => {
    expect(normalizarPagina({ content: membros })).toEqual({ content: membros, number: 0, size: 2, totalElements: 2, totalPages: 1 });
  });

  it('página vazia', () => {
    expect(normalizarPagina({ content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } })).toEqual({
      content: [],
      number: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
    });
  });

  it('recusa respostas sem content', () => {
    [null, {}, { content: 'x' }, []].forEach((bruta) => {
      expect(() => normalizarPagina(bruta)).toThrow(ApiError);
    });
    try {
      normalizarPagina({});
    } catch (erro) {
      expect(erro.tipo).toBe(TIPOS_ERRO.RESPOSTA_INVALIDA);
    }
  });
});

describe('montarParametrosPagina', () => {
  it('monta page, size, sort e filtros', () => {
    expect(
      montarParametrosPagina({ pagina: 2, tamanho: 10, ordenacao: 'nome,asc', filtros: { nome: ' ana ', status: 'ATIVO' } }),
    ).toEqual({ nome: 'ana', status: 'ATIVO', page: 2, size: 10, sort: 'nome,asc' });
  });

  it('descarta filtros vazios e omite size/sort não informados', () => {
    expect(montarParametrosPagina({ filtros: { nome: '  ', dataInicio: null, dataFim: undefined, tipo: 0 } })).toEqual({
      tipo: 0,
      page: 0,
    });
  });

  it('respeita os limites do Pageable', () => {
    expect(montarParametrosPagina({ pagina: -3, tamanho: 5000 })).toEqual({ page: 0, size: TAMANHO_MAXIMO_PAGINA });
    expect(montarParametrosPagina({ tamanho: 0 }).size).toBe(1);
  });
});

describe('faixaDaPagina', () => {
  it('calcula "Mostrando X–Y de Z"', () => {
    expect(faixaDaPagina(ESPERADO)).toEqual({ inicio: 11, fim: 12, total: 12 });
    expect(faixaDaPagina({ content: new Array(10).fill({}), number: 0, size: 10, totalElements: 25 })).toEqual({
      inicio: 1,
      fim: 10,
      total: 25,
    });
  });

  it('zera a faixa quando não há itens', () => {
    expect(faixaDaPagina({ content: [], number: 0, size: 10, totalElements: 0 })).toEqual({ inicio: 0, fim: 0, total: 0 });
  });
});
