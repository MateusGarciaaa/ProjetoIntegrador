import { describe, expect, it } from 'vitest';
import { ApiError, TIPOS_ERRO } from '../services/http/apiError';
import {
  categoriaCompativel,
  categoriasDoTipo,
  formatarCampoMovimentacao,
  formatarValorAoSair,
  isMovimentacaoInexistente,
  mapearErroDoServidor,
  montarPayloadMovimentacao,
  validarMovimentacao,
  validarValor,
  valoresIniciaisMovimentacao,
} from './movimentacaoSchema';

const CATEGORIAS = [
  { id: 'c-ofertas', nome: 'Ofertas', tipo: 'RECEITA' },
  { id: 'c-dizimos', nome: 'Dízimos', tipo: 'RECEITA' },
  { id: 'c-energia', nome: 'Água e energia', tipo: 'DESPESA' },
];

const VALIDOS = {
  tipo: 'RECEITA',
  valor: '1.234,56',
  data: '05/10/2026',
  categoriaId: 'c-dizimos',
  descricao: '  Dízimo   de outubro ',
  membro: { id: 'm1', nome: 'Ana Beatriz Carvalho', status: 'ATIVO' },
};

function erroApi(status, message) {
  return new ApiError({ tipo: status === 404 ? TIPOS_ERRO.NAO_ENCONTRADO : TIPOS_ERRO.VALIDACAO, status, message, corpoApi: true });
}

describe('valoresIniciaisMovimentacao', () => {
  it('nova: sem tipo, data de hoje e campos vazios', () => {
    expect(valoresIniciaisMovimentacao(null, { hoje: '2026-10-27' })).toEqual({
      tipo: '',
      valor: '',
      data: '27/10/2026',
      categoriaId: '',
      descricao: '',
      membro: null,
    });
  });

  it('edição: converte o response (valor em formato brasileiro, data DD/MM/AAAA, membro)', () => {
    const resposta = {
      id: 'x',
      descricao: 'Dízimo',
      valor: 275.5,
      data: '2026-10-06',
      tipo: 'RECEITA',
      categoria: { id: 'c-dizimos', nome: 'Dízimos', tipo: 'RECEITA' },
      membroId: 'm1',
      membroNome: 'Ana',
    };
    expect(valoresIniciaisMovimentacao({ ...resposta, valor: 450 }).valor).toBe('450,00');
    expect(valoresIniciaisMovimentacao(resposta)).toEqual({
      tipo: 'RECEITA',
      valor: '275,50',
      data: '06/10/2026',
      categoriaId: 'c-dizimos',
      descricao: 'Dízimo',
      membro: { id: 'm1', nome: 'Ana' },
    });
  });
});

describe('máscaras', () => {
  it('valor e data mascarados na digitação', () => {
    expect(formatarCampoMovimentacao('valor', '-1.234,567')).toBe('1234,56');
    expect(formatarCampoMovimentacao('data', '05102026')).toBe('05/10/2026');
    expect(formatarCampoMovimentacao('descricao', 'x')).toBe('x');
  });

  it('o valor ganha o formato completo ao sair do campo', () => {
    expect(formatarValorAoSair('1234,5')).toBe('1.234,50');
    expect(formatarValorAoSair('12')).toBe('12,00');
    expect(formatarValorAoSair('')).toBe('');
    expect(formatarValorAoSair('abc')).toBe('abc');
  });
});

describe('validarValor (RN06/RN07)', () => {
  it('aceita valores positivos com até 2 casas e 10 dígitos inteiros', () => {
    ['0,01', '1', '150,00', '1.234,56', '1234,5', '9.999.999.999,99'].forEach((valor) => expect(validarValor(valor)).toBeNull());
  });

  it('recusa vazio, zero e negativo', () => {
    expect(validarValor('')).toBe('Informe o valor.');
    expect(validarValor('0')).toBe('O valor deve ser maior que zero.');
    expect(validarValor('0,00')).toBe('O valor deve ser maior que zero.');
    expect(validarValor('-10,00')).toMatch(/sem sinal de menos/);
  });

  it('recusa mais de 2 casas, mais de 10 dígitos inteiros e texto inválido', () => {
    expect(validarValor('1,005')).toBe('Use no máximo 2 casas decimais.');
    expect(validarValor('12345678901')).toBe('Use no máximo 10 dígitos antes da vírgula.');
    expect(validarValor('1.23,4')).toBe('Informe um valor válido, ex.: 150,00.');
    expect(validarValor('abc')).toBe('Informe um valor válido, ex.: 150,00.');
  });
});

describe('validarMovimentacao', () => {
  it('válida não tem erros', () => {
    expect(validarMovimentacao(VALIDOS, { categorias: CATEGORIAS })).toEqual({});
  });

  it('RN10: categoria obrigatória', () => {
    expect(validarMovimentacao({ ...VALIDOS, categoriaId: '' })).toEqual({ categoriaId: 'Escolha a categoria.' });
  });

  it('categoria precisa ser do tipo escolhido', () => {
    expect(validarMovimentacao({ ...VALIDOS, tipo: 'DESPESA' }, { categorias: CATEGORIAS })).toEqual({
      categoriaId: 'Escolha uma categoria de despesa.',
    });
  });

  it('tipo, data e descrição obrigatórios; descrição até 255', () => {
    const erros = validarMovimentacao({ ...VALIDOS, tipo: '', data: '31/02/2026', descricao: '   ' });
    expect(erros).toEqual({
      tipo: 'Escolha se é uma receita ou uma despesa.',
      data: 'Informe uma data válida, no formato DD/MM/AAAA.',
      descricao: 'Informe a descrição.',
    });
    expect(validarMovimentacao({ ...VALIDOS, descricao: 'a'.repeat(256) }).descricao).toBe('Use no máximo 255 caracteres.');
  });
});

describe('montarPayloadMovimentacao', () => {
  it('monta o request com valor numérico positivo de 2 casas, data ISO e texto aparado', () => {
    expect(montarPayloadMovimentacao(VALIDOS)).toEqual({
      descricao: 'Dízimo de outubro',
      valor: 1234.56,
      data: '2026-10-05',
      tipo: 'RECEITA',
      categoriaId: 'c-dizimos',
      membroId: 'm1',
    });
  });

  it('despesa também vai com valor positivo; sem membro → null', () => {
    const payload = montarPayloadMovimentacao({ ...VALIDOS, tipo: 'DESPESA', categoriaId: 'c-energia', valor: '486,32', membro: null });
    expect(payload.valor).toBe(486.32);
    expect(payload.valor).toBeGreaterThan(0);
    expect(payload.membroId).toBeNull();
    expect(JSON.stringify(payload)).toContain('"valor":486.32');
  });

  it('nunca monta valor zero ou negativo', () => {
    expect(() => montarPayloadMovimentacao({ ...VALIDOS, valor: '0,00' })).toThrow();
    expect(() => montarPayloadMovimentacao({ ...VALIDOS, valor: '-5' })).toThrow();
  });
});

describe('categorias', () => {
  it('filtra pelo tipo e ordena por nome', () => {
    expect(categoriasDoTipo(CATEGORIAS, 'RECEITA').map((c) => c.nome)).toEqual(['Dízimos', 'Ofertas']);
    expect(categoriasDoTipo(CATEGORIAS, '').map((c) => c.nome)).toEqual(['Água e energia', 'Dízimos', 'Ofertas']);
  });

  it('confere se a categoria serve para o tipo', () => {
    expect(categoriaCompativel(CATEGORIAS, 'c-dizimos', 'RECEITA')).toBe(true);
    expect(categoriaCompativel(CATEGORIAS, 'c-dizimos', 'DESPESA')).toBe(false);
    expect(categoriaCompativel(CATEGORIAS, 'inexistente', 'RECEITA')).toBe(false);
  });
});

describe('mapearErroDoServidor', () => {
  it('400 do @Valid vai para cada campo', () => {
    const erro = erroApi(400, 'A categoria é obrigatória, O valor deve ser positivo');
    expect(mapearErroDoServidor(erro)).toEqual({
      camposErro: { categoriaId: 'A categoria é obrigatória', valor: 'O valor deve ser positivo' },
      erroGeral: null,
    });
  });

  it('400 de tipo incompatível e 404 de categoria vão para a categoria; 404 de membro, para o membro', () => {
    const incompativel = 'O tipo da movimentação (DESPESA) não é compatível com o tipo da categoria (RECEITA)';
    expect(mapearErroDoServidor(erroApi(400, incompativel)).camposErro).toEqual({ categoriaId: incompativel });
    expect(mapearErroDoServidor(erroApi(404, 'Categoria financeira não encontrada')).camposErro).toEqual({
      categoriaId: 'Categoria financeira não encontrada',
    });
    expect(mapearErroDoServidor(erroApi(404, 'Membro não encontrado')).camposErro).toEqual({ membro: 'Membro não encontrado' });
  });

  it('404 da própria movimentação é reconhecido à parte', () => {
    expect(isMovimentacaoInexistente(erroApi(404, 'Movimentação financeira não encontrada'))).toBe(true);
    expect(isMovimentacaoInexistente(erroApi(404, 'Membro não encontrado'))).toBe(false);
  });
});
