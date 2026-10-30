import { describe, expect, it } from 'vitest';
import { ApiError, TIPOS_ERRO } from '../services/http/apiError';
import { mapearErroTrocaSenha, montarPayloadTrocaSenha, validarTrocaSenha } from './contaSchema';
import { textosDoLink } from './senhaSchema';

describe('troca de senha em Minha conta', () => {
  it('exige a senha atual e aplica à nova as regras do reset', () => {
    expect(validarTrocaSenha({ senhaAtual: '', novaSenha: '123', confirmacao: '12' })).toEqual({
      senhaAtual: 'Informe a senha atual.',
      novaSenha: 'A senha deve ter entre 6 e 72 caracteres.',
      confirmacao: 'As senhas não coincidem.',
    });
    expect(validarTrocaSenha({ senhaAtual: 'atual1', novaSenha: 'é'.repeat(37), confirmacao: 'é'.repeat(37) }).novaSenha).toBe(
      'A senha é longa demais: use menos caracteres acentuados ou especiais.',
    );
  });

  it('recusa nova senha igual à atual, como o backend', () => {
    expect(validarTrocaSenha({ senhaAtual: 'mesma1', novaSenha: 'mesma1', confirmacao: 'mesma1' })).toEqual({
      novaSenha: 'A nova senha deve ser diferente da atual.',
    });
    expect(validarTrocaSenha({ senhaAtual: 'atual1', novaSenha: 'outra1', confirmacao: 'outra1' })).toEqual({});
  });

  it('envia os nomes do AlterarSenhaRequest, sem trim', () => {
    expect(montarPayloadTrocaSenha({ senhaAtual: ' a b ', novaSenha: ' c d e ', confirmacao: ' c d e ' })).toEqual({
      currentPassword: ' a b ',
      newPassword: ' c d e ',
    });
  });

  it('senha atual incorreta (400) vai para o campo, sem encerrar a sessão', () => {
    const erro = new ApiError({ tipo: TIPOS_ERRO.VALIDACAO, status: 400, message: 'A senha atual está incorreta', corpoApi: true });
    expect(erro.isFimDeSessao()).toBe(false);
    expect(mapearErroTrocaSenha(erro)).toEqual({ camposErro: { senhaAtual: 'A senha atual está incorreta' }, erroGeral: null });
  });
});

describe('textos da tela do link de senha', () => {
  it('convite=1 só troca os textos para as boas-vindas', () => {
    expect(textosDoLink(new URLSearchParams('token=abc&convite=1'))).toMatchObject({
      titulo: 'Bem-vindo ao ChurchHub!',
      descricao: 'Defina sua senha para começar.',
      botao: 'Definir senha',
    });
    expect(textosDoLink(new URLSearchParams('token=abc')).titulo).toBe('Redefinir senha');
    expect(textosDoLink(new URLSearchParams('token=abc&convite=sim')).titulo).toBe('Redefinir senha');
  });
});
