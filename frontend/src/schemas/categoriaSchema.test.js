import { describe, expect, it } from 'vitest';
import { ApiError, TIPOS_ERRO } from '../services/http/apiError';
import { mapearErroCategoria, montarPayloadCategoria, validarCategoria } from './categoriaSchema';

const EXISTENTES = [
  { id: 'c1', nome: 'Dízimos', tipo: 'RECEITA' },
  { id: 'c2', nome: 'Manutenção', tipo: 'DESPESA' },
];

describe('validarCategoria', () => {
  it('nome e tipo obrigatórios; nome até 100', () => {
    expect(validarCategoria({ nome: ' ', tipo: '' })).toEqual({
      nome: 'Informe o nome da categoria.',
      tipo: 'Escolha se a categoria é de receita ou de despesa.',
    });
    expect(validarCategoria({ nome: 'a'.repeat(101), tipo: 'RECEITA' }).nome).toBe('Use no máximo 100 caracteres.');
    expect(validarCategoria({ nome: 'Missões', tipo: 'RECEITA' }, { existentes: EXISTENTES })).toEqual({});
  });

  it('recusa nome repetido no mesmo tipo, sem diferenciar maiúsculas nem espaços', () => {
    expect(validarCategoria({ nome: '  dízimos ', tipo: 'RECEITA' }, { existentes: EXISTENTES }).nome).toBe(
      'Já existe a categoria "Dízimos" para receitas.',
    );
    // Mesmo nome em outro tipo é permitido (UNIQUE (nome, tipo) no banco).
    expect(validarCategoria({ nome: 'Dízimos', tipo: 'DESPESA' }, { existentes: EXISTENTES })).toEqual({});
  });
});

describe('montarPayloadCategoria / mapearErroCategoria', () => {
  it('apara o nome', () => {
    expect(montarPayloadCategoria({ nome: '  Ação   social ', tipo: 'DESPESA' })).toEqual({ nome: 'Ação social', tipo: 'DESPESA' });
  });

  it('409 de duplicada vai para o nome', () => {
    const erro = new ApiError({
      tipo: TIPOS_ERRO.CONFLITO,
      status: 409,
      message: 'Já existe uma categoria com este nome para este tipo',
      corpoApi: true,
    });
    expect(mapearErroCategoria(erro)).toEqual({ camposErro: { nome: erro.message }, erroGeral: null });
  });
});
