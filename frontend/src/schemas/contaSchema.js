import { criarMapeadorDeErros } from './errosServidor';
import { SENHA_MAX, validarRedefinicao } from './senhaSchema';

/** Formulário de troca de senha em "Minha conta". */
export const CAMPOS_TROCA_SENHA = Object.freeze(['senhaAtual', 'novaSenha', 'confirmacao']);

export const VALORES_INICIAIS_TROCA_SENHA = Object.freeze({ senhaAtual: '', novaSenha: '', confirmacao: '' });

function bytesUtf8(texto) {
  return new TextEncoder().encode(texto).length;
}

/**
 * Mesmas regras do AlterarSenhaRequest: senha atual obrigatória e dentro do limite do BCrypt; a
 * nova segue as do reset (6 a 72 caracteres, até 72 bytes) e precisa ser diferente da atual,
 * como o ContaService confere. A senha atual em si só o backend confere.
 */
export function validarTrocaSenha({ senhaAtual, novaSenha, confirmacao }) {
  const erros = validarRedefinicao({ novaSenha, confirmacao });
  if (!senhaAtual) erros.senhaAtual = 'Informe a senha atual.';
  else if (bytesUtf8(senhaAtual) > SENHA_MAX) erros.senhaAtual = 'A senha atual é longa demais.';
  if (!erros.novaSenha && senhaAtual && novaSenha === senhaAtual) {
    erros.novaSenha = 'A nova senha deve ser diferente da atual.';
  }
  return erros;
}

/** PUT /me/password usa os nomes do AlterarSenhaRequest. A senha vai como foi digitada (sem trim). */
export function montarPayloadTrocaSenha({ senhaAtual, novaSenha }) {
  return { currentPassword: senhaAtual, newPassword: novaSenha };
}

/** Erros do servidor → campos. Provisório: depende do texto do AlterarSenhaRequest e do ContaService. */
export const mapearErroTrocaSenha = criarMapeadorDeErros({
  campoPorMensagem: {
    'A senha atual é obrigatória': 'senhaAtual',
    'A senha atual está incorreta': 'senhaAtual',
    'A senha atual é longa demais: o limite é de 72 bytes (letras acentuadas e símbolos ocupam 2 ou mais)': 'senhaAtual',
    'A nova senha é obrigatória': 'novaSenha',
    'A nova senha deve ter entre 6 e 72 caracteres': 'novaSenha',
    'A nova senha deve ser diferente da atual': 'novaSenha',
    'A nova senha é longa demais: o limite é de 72 bytes (letras acentuadas e símbolos ocupam 2 ou mais)': 'novaSenha',
  },
});
