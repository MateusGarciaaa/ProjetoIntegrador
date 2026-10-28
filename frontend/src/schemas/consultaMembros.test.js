import { describe, expect, it } from 'vitest';
import { CONSULTA_PADRAO_MEMBROS, lerConsultaMembros, parametrosDaConsulta, temFiltro } from './consultaMembros';

const ler = (query) => lerConsultaMembros(new URLSearchParams(query));

describe('lerConsultaMembros', () => {
  it('URL sem parâmetros é a consulta padrão (nome, crescente, 1ª página)', () => {
    expect(ler('')).toEqual(CONSULTA_PADRAO_MEMBROS);
    expect(CONSULTA_PADRAO_MEMBROS).toEqual({ nome: '', status: '', pagina: 0, campo: 'nome', direcao: 'asc' });
  });

  it('lê busca, status, página (base 1 na URL) e ordem', () => {
    expect(ler('busca=%20ana%20&status=AFASTADO&pagina=3&ordem=email,desc')).toEqual({
      nome: 'ana',
      status: 'AFASTADO',
      pagina: 2,
      campo: 'email',
      direcao: 'desc',
    });
  });

  it('valores inválidos voltam ao padrão em vez de virar 400 no backend', () => {
    expect(ler('status=INATIVO&pagina=0&ordem=cpf,asc')).toEqual(CONSULTA_PADRAO_MEMBROS);
    expect(ler('pagina=abc&ordem=nome,cima')).toEqual(CONSULTA_PADRAO_MEMBROS);
    expect(ler('pagina=2.5').pagina).toBe(0);
  });
});

describe('parametrosDaConsulta', () => {
  it('omite os valores padrão', () => {
    expect(parametrosDaConsulta(CONSULTA_PADRAO_MEMBROS)).toEqual({});
  });

  it('é o inverso de lerConsultaMembros', () => {
    const consulta = { nome: 'lu', status: 'VISITANTE', pagina: 1, campo: 'status', direcao: 'desc' };
    const parametros = parametrosDaConsulta(consulta);
    expect(parametros).toEqual({ busca: 'lu', status: 'VISITANTE', pagina: '2', ordem: 'status,desc' });
    expect(ler(new URLSearchParams(parametros).toString())).toEqual(consulta);
  });

  it('nome desc também vai para a URL', () => {
    expect(parametrosDaConsulta({ ...CONSULTA_PADRAO_MEMBROS, direcao: 'desc' })).toEqual({ ordem: 'nome,desc' });
  });
});

describe('temFiltro', () => {
  it('considera busca e status', () => {
    expect(temFiltro(CONSULTA_PADRAO_MEMBROS)).toBe(false);
    expect(temFiltro({ nome: 'a', status: '' })).toBe(true);
    expect(temFiltro({ nome: '', status: 'ATIVO' })).toBe(true);
  });
});
