import { describe, expect, it } from 'vitest';
import { ApiError, TIPOS_ERRO } from '../services/http/apiError';
import { criarMapeadorDeErros } from './errosServidor';

const mapear = criarMapeadorDeErros({
  campoPorMensagem: { 'O CPF é obrigatório': 'cpf', 'E-mail inválido': 'email', 'O nome é obrigatório': 'nome' },
  campoPorConflito: [
    { padrao: /e-?mail/i, campo: 'email' },
    { padrao: /\bcpf\b/i, campo: 'cpf' },
  ],
});

const erro = (status, message, corpoApi = true) => new ApiError({ tipo: TIPOS_ERRO.VALIDACAO, status, message, corpoApi });

describe('criarMapeadorDeErros', () => {
  it('400: distribui as mensagens juntadas por ", " entre os campos', () => {
    expect(mapear(erro(400, 'O nome é obrigatório, E-mail inválido'))).toEqual({
      camposErro: { nome: 'O nome é obrigatório', email: 'E-mail inválido' },
      erroGeral: null,
    });
  });

  it('400: mensagens não reconhecidas vão para o topo, com o separador original', () => {
    expect(mapear(erro(400, 'O CPF é obrigatório, Regra A, Regra B'))).toEqual({
      camposErro: { cpf: 'O CPF é obrigatório' },
      erroGeral: 'Regra A, Regra B',
    });
  });

  it('400: mensagem única com vírgula no texto não é quebrada', () => {
    const corpoInvalido = 'Corpo da requisição inválido. Confira o JSON, as datas (AAAA-MM-DD) e os valores permitidos.';
    expect(mapear(erro(400, corpoInvalido))).toEqual({ camposErro: {}, erroGeral: corpoInvalido });
  });

  it('400 sem corpo da API não é tratado como validação', () => {
    expect(mapear(erro(400, 'Confira os dados informados.', false))).toEqual({
      camposErro: {},
      erroGeral: 'Confira os dados informados.',
    });
  });

  it('409: e-mail e CPF duplicados vão para o campo certo', () => {
    expect(mapear(erro(409, 'Já existe um membro com este e-mail')).camposErro).toEqual({
      email: 'Já existe um membro com este e-mail',
    });
    expect(mapear(erro(409, 'Já existe um membro com este CPF')).camposErro).toEqual({
      cpf: 'Já existe um membro com este CPF',
    });
  });

  it('409 desconhecido e demais status vão para o topo', () => {
    expect(mapear(erro(409, 'Registro duplicado'))).toEqual({ camposErro: {}, erroGeral: 'Registro duplicado' });
    expect(mapear(erro(500, 'Falhou'))).toEqual({ camposErro: {}, erroGeral: 'Falhou' });
  });
});
