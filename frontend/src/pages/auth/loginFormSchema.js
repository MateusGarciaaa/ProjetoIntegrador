import { isBlank, isValidEmail } from '../../utils/validators';

export const EMPTY_LOGIN_FORM = Object.freeze({ email: '', password: '' });

export function validateLoginForm({ email, password }) {
  const errors = {};
  if (isBlank(email)) errors.email = 'Informe seu e-mail.';
  else if (!isValidEmail(email)) errors.email = 'Informe um e-mail válido, como nome@exemplo.com.';
  if (isBlank(password)) errors.password = 'Informe sua senha.';
  return errors;
}
