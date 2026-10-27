import { isEmailValido } from './email';
import { criarMapeadorDeErros } from './errosServidor';

/** @Size(min = 6, max = 72) do ResetPasswordRequest. */
export const SENHA_MIN = 6;
export const SENHA_MAX = 72;

/**
 * Exibida depois de QUALQUER envio do "Esqueci minha senha", com sucesso ou erro:
 * um 500 ou um tempo esgotado que só acontecesse para contas existentes revelaria o cadastro.
 */
export const MENSAGEM_NEUTRA_ESQUECI = 'Se o e-mail existir em nossa base, um link foi enviado.';

export const MENSAGEM_TOKEN_INVALIDO =
  'Este link de redefinição é inválido ou expirou. Os links valem por 30 minutos e só podem ser usados uma vez.';

export const VALORES_INICIAIS_ESQUECI = Object.freeze({ email: '' });
export const VALORES_INICIAIS_REDEFINICAO = Object.freeze({ novaSenha: '', confirmacao: '' });

export function validarEsqueciSenha({ email }) {
  if (!email.trim()) return { email: 'Informe seu e-mail.' };
  if (!isEmailValido(email)) return { email: 'Informe um e-mail válido, como nome@igreja.org.' };
  return {};
}

function bytesUtf8(texto) {
  return new TextEncoder().encode(texto).length;
}

/**
 * Mesmas regras do ResetPasswordRequest: @NotBlank, 6 a 72 caracteres e @CabeNoBcrypt (o BCrypt
 * só aceita 72 BYTES, e uma senha acentuada pode ter menos de 72 caracteres e passar disso).
 * A senha é enviada como foi digitada (sem trim), como o backend a grava.
 */
export function validarRedefinicao({ novaSenha, confirmacao }) {
  const erros = {};
  if (!novaSenha.trim()) erros.novaSenha = 'Informe a nova senha.';
  else if (novaSenha.length < SENHA_MIN || novaSenha.length > SENHA_MAX) {
    erros.novaSenha = `A senha deve ter entre ${SENHA_MIN} e ${SENHA_MAX} caracteres.`;
  } else if (bytesUtf8(novaSenha) > SENHA_MAX) {
    erros.novaSenha = 'A senha é longa demais: use menos caracteres acentuados ou especiais.';
  }

  if (!confirmacao) erros.confirmacao = 'Repita a nova senha.';
  else if (confirmacao !== novaSenha) erros.confirmacao = 'As senhas não coincidem.';
  return erros;
}

/** Mensagens exatas do backend (ResetPasswordRequest e InvalidOrExpiredResetTokenException). */
const MENSAGENS_TOKEN = new Set(['Token de redefinição inválido ou expirado', 'O token é obrigatório']);

export function isTokenInvalido(erro) {
  if (erro?.status !== 400 || !erro.corpoApi) return false;
  return erro.message.split(', ').some((parte) => MENSAGENS_TOKEN.has(parte.trim()));
}

export const mapearErroRedefinicao = criarMapeadorDeErros({
  campoPorMensagem: {
    'A nova senha é obrigatória': 'novaSenha',
    'A nova senha deve ter entre 6 e 72 caracteres': 'novaSenha',
    'A nova senha é longa demais: o limite é de 72 bytes (letras acentuadas e símbolos ocupam 2 ou mais)': 'novaSenha',
  },
});
