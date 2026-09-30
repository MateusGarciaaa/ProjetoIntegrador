import { isEmailValido } from './email';

export const VALORES_INICIAIS_LOGIN = Object.freeze({ email: '', password: '' });

export function validarLogin({ email, password }) {
  const erros = {};
  if (!email.trim()) erros.email = 'Informe seu e-mail.';
  else if (!isEmailValido(email)) erros.email = 'Informe um e-mail válido, como nome@igreja.org.';
  if (!password) erros.password = 'Informe sua senha.';
  return erros;
}
