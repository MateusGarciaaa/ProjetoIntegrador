import { emitirTokenFalso } from '../mockJwt';
import { erroApi, ok } from '../respostas';

/** @Email do Hibernate: aceita domínio sem ponto e trata vazio como válido. */
const EMAIL_HIBERNATE = /^[^\s@]+@[^\s@]+$/;

function validarLoginRequest(corpo) {
  const erros = [];
  const email = corpo?.email;
  if (typeof email !== 'string' || !email.trim()) erros.push('não deve estar em branco');
  if (typeof email === 'string' && email.length > 0 && !EMAIL_HIBERNATE.test(email)) {
    erros.push('deve ser um endereço de e-mail bem formado');
  }
  if (typeof corpo?.password !== 'string' || !corpo.password.trim()) erros.push('não deve estar em branco');
  return erros;
}

export function login({ banco, corpo, caminho, agoraMs, validadeSegundos }) {
  const erros = validarLoginRequest(corpo);
  if (erros.length) return erroApi(400, erros.join(', '), caminho);

  // Busca exata, como UsuarioRepository.findByEmail; usuário inativo também falha.
  const usuario = banco.usuarios.find((u) => u.email === corpo.email);
  if (!usuario || !usuario.ativo || usuario.senha !== corpo.password) {
    return erroApi(401, 'E-mail ou senha inválidos', caminho);
  }

  const token = emitirTokenFalso({ email: usuario.email, perfil: usuario.perfil, agoraMs, validadeSegundos });
  return ok(200, { token, type: 'Bearer', expiresIn: validadeSegundos });
}
