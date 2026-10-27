import { describe, expect, it } from 'vitest';
import { isTokenInvalido, mapearErroRedefinicao, validarEsqueciSenha, validarRedefinicao } from './senhaSchema';

const senhaDe = (tamanho, caractere = 'a') => caractere.repeat(tamanho);
const erroApi400 = (message) => ({ status: 400, corpoApi: true, message });

describe('validarEsqueciSenha', () => {
  it('exige e-mail válido', () => {
    expect(validarEsqueciSenha({ email: ' ' })).toEqual({ email: 'Informe seu e-mail.' });
    expect(validarEsqueciSenha({ email: 'ana@igreja' }).email).toMatch(/válido/);
    expect(validarEsqueciSenha({ email: 'ana@igreja.org' })).toEqual({});
  });
});

describe('validarRedefinicao', () => {
  const validar = (novaSenha, confirmacao = novaSenha) => validarRedefinicao({ novaSenha, confirmacao });

  it('aceita de 6 a 72 caracteres, como o @Size do ResetPasswordRequest', () => {
    expect(validar(senhaDe(5)).novaSenha).toBe('A senha deve ter entre 6 e 72 caracteres.');
    expect(validar(senhaDe(6))).toEqual({});
    expect(validar(senhaDe(72))).toEqual({});
    expect(validar(senhaDe(73)).novaSenha).toBe('A senha deve ter entre 6 e 72 caracteres.');
  });

  it('só espaços é senha ausente (@NotBlank)', () => {
    expect(validar('      ').novaSenha).toBe('Informe a nova senha.');
  });

  it('recusa mais de 72 bytes em UTF-8 (limite do BCrypt), mesmo com até 72 caracteres', () => {
    expect(validar(senhaDe(36, 'é'))).toEqual({});
    expect(validar(senhaDe(37, 'é')).novaSenha).toMatch(/longa demais/);
  });

  it('exige a confirmação igual', () => {
    expect(validar('segredo1', '').confirmacao).toBe('Repita a nova senha.');
    expect(validar('segredo1', 'segredo2').confirmacao).toBe('As senhas não coincidem.');
  });
});

describe('erros do servidor no reset', () => {
  it('reconhece o token inválido ou ausente pelas mensagens do backend', () => {
    expect(isTokenInvalido(erroApi400('Token de redefinição inválido ou expirado'))).toBe(true);
    expect(isTokenInvalido(erroApi400('O token é obrigatório, A nova senha é obrigatória'))).toBe(true);
    expect(isTokenInvalido(erroApi400('A nova senha deve ter entre 6 e 72 caracteres'))).toBe(false);
    expect(isTokenInvalido({ status: 500, corpoApi: true, message: 'Token de redefinição inválido ou expirado' })).toBe(false);
  });

  it('leva as mensagens de newPassword para o campo novaSenha', () => {
    expect(mapearErroRedefinicao(erroApi400('A nova senha deve ter entre 6 e 72 caracteres'))).toEqual({
      camposErro: { novaSenha: 'A nova senha deve ter entre 6 e 72 caracteres' },
      erroGeral: null,
    });
  });
});
