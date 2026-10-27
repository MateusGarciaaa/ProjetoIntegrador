import { isEmailValido } from './email';

export const VALORES_INICIAIS_LOGIN = Object.freeze({ email: '', password: '' });

/**
 * Credenciais recusadas (401): nunca dizer qual dos dois está errado. O texto é fixo no
 * frontend (igual ao do backend hoje) para não depender da mensagem do servidor.
 */
export const MENSAGEM_CREDENCIAIS_INVALIDAS = 'E-mail ou senha inválidos';

export function validarLogin({ email, password }) {
  const erros = {};
  if (!email.trim()) erros.email = 'Informe seu e-mail.';
  else if (!isEmailValido(email)) erros.email = 'Informe um e-mail válido, como nome@igreja.org.';
  // @NotBlank: só espaços também é senha ausente.
  if (!password.trim()) erros.password = 'Informe sua senha.';
  return erros;
}

/** Mensagem do topo do formulário para um erro do login. */
export function mensagemErroLogin(erro) {
  return erro?.status === 401 ? MENSAGEM_CREDENCIAIS_INVALIDAS : erro?.message;
}
