import { novoId } from '../bancoEmMemoria';
import { emitirTokenFalso } from '../mockJwt';
import { erroApi, ok } from '../respostas';

/** @Email do Hibernate: aceita domínio sem ponto e trata vazio como válido. */
export const EMAIL_HIBERNATE = /^[^\s@]+@[^\s@]+$/;

/** app.jwt.reset-token-expiration-minutes (application.yml). */
const VALIDADE_TOKEN_REDEFINICAO_MS = 30 * 60 * 1000;

/** AuthService.VALIDADE_CONVITE: o convite vale mais que a redefinição. */
export const VALIDADE_CONVITE_MS = 72 * 60 * 60 * 1000;

/** Usuario.definirSenha: o instante da troca, truncado em segundos (precisão do iat). */
export function instanteDaTroca(agoraMs) {
  return Math.floor(agoraMs / 1000) * 1000;
}

/** AuthService.gerarLink: só o link mais recente vale (os pendentes são invalidados antes). */
export function gerarLink(banco, usuario, agoraMs, validadeMs) {
  invalidarLinksPendentes(banco, usuario);
  const token = novoId();
  banco.tokensRedefinicao.push({ token, email: usuario.email, expiraEm: agoraMs + validadeMs, usado: false });
  return token;
}

/** PasswordResetTokenRepository.invalidarPendentes. */
export function invalidarLinksPendentes(banco, usuario) {
  banco.tokensRedefinicao.filter((t) => t.email === usuario.email).forEach((t) => (t.usado = true));
}

export const MENSAGENS_AUTH = Object.freeze({
  CREDENCIAIS_INVALIDAS: 'E-mail ou senha inválidos',
  ESQUECI_SENHA: 'Se o e-mail existir em nossa base, um link de redefinição foi enviado.',
  TOKEN_INVALIDO: 'Token de redefinição inválido ou expirado',
});

export const emBranco = (valor) => typeof valor !== 'string' || !valor.trim();

/** @CabeNoBcrypt: até 72 bytes em UTF-8 (não caracteres). */
export const MENSAGEM_BCRYPT = 'é longa demais: o limite é de 72 bytes (letras acentuadas e símbolos ocupam 2 ou mais)';
export const excedeBcrypt = (senha) => typeof senha === 'string' && new TextEncoder().encode(senha).length > 72;

export function validarEmail(email) {
  const erros = [];
  if (emBranco(email)) erros.push('O e-mail é obrigatório');
  if (typeof email === 'string' && email.length > 0 && !EMAIL_HIBERNATE.test(email)) erros.push('E-mail inválido');
  return erros;
}

/** Corpo que não é objeto JSON não chega ao @Valid (HttpMessageNotReadableException). */
export function corpoIlegivel(corpo) {
  return !corpo || typeof corpo !== 'object' || Array.isArray(corpo);
}

/** Mensagens das anotações do LoginRequest. */
function validarLoginRequest(corpo) {
  const erros = validarEmail(corpo.email);
  if (emBranco(corpo.password)) erros.push('A senha é obrigatória');
  if (excedeBcrypt(corpo.password)) erros.push(`A senha ${MENSAGEM_BCRYPT}`);
  return erros;
}

/** Mensagens das anotações do ForgotPasswordRequest. */
function validarForgotPasswordRequest(corpo) {
  return validarEmail(corpo.email);
}

/** Mensagens das anotações do ResetPasswordRequest (@Size conta caracteres UTF-16, como String.length). */
function validarResetPasswordRequest(corpo) {
  const erros = [];
  if (emBranco(corpo.token)) erros.push('O token é obrigatório');
  const { newPassword } = corpo;
  if (emBranco(newPassword)) erros.push('A nova senha é obrigatória');
  if (typeof newPassword === 'string' && (newPassword.length < 6 || newPassword.length > 72)) {
    erros.push('A nova senha deve ter entre 6 e 72 caracteres');
  }
  if (excedeBcrypt(newPassword)) erros.push(`A nova senha ${MENSAGEM_BCRYPT}`);
  return erros;
}

/** NormalizadorEmail do backend, usado no login e no forgot-password. */
export const normalizarEmail = (email) => email.trim().toLowerCase();

export function login({ banco, corpo, caminho, agoraMs, validadeSegundos }) {
  // Usuário inativo também falha, com a mesma mensagem.
  const usuario = banco.usuarios.find((u) => u.email === normalizarEmail(corpo.email));
  if (!usuario || !usuario.ativo || usuario.senha !== corpo.password) {
    return erroApi(401, MENSAGENS_AUTH.CREDENCIAIS_INVALIDAS, caminho);
  }

  const token = emitirTokenFalso({ email: usuario.email, nome: usuario.nome, perfil: usuario.perfil, agoraMs, validadeSegundos });
  return ok(200, { token, type: 'Bearer', expiresIn: validadeSegundos });
}

/**
 * AuthService.forgotPassword: e-mail normalizado, só usuário ativo recebe link, e um pedido
 * novo invalida os links pendentes. A resposta é sempre a mesma, exista ou não a conta.
 */
export function esqueciSenha({ banco, corpo, agoraMs, aoEnviarEmail }) {
  const usuario = banco.usuarios.find((u) => u.email === normalizarEmail(corpo.email) && u.ativo);
  if (usuario) {
    const token = gerarLink(banco, usuario, agoraMs, VALIDADE_TOKEN_REDEFINICAO_MS);
    aoEnviarEmail?.({ para: usuario.email, link: `/reset-password?token=${token}` });
  }
  return ok(200, { message: MENSAGENS_AUTH.ESQUECI_SENHA });
}

/** AuthService.resetPassword: token inexistente, usado, vencido ou de usuário inativo → 400; sucesso → 204. */
export function redefinirSenha({ banco, corpo, caminho, agoraMs }) {
  const registro = banco.tokensRedefinicao.find((t) => t.token === corpo.token);
  const usuario = registro && banco.usuarios.find((u) => u.email === registro.email);
  if (!registro || registro.usado || registro.expiraEm <= agoraMs || !usuario.ativo) {
    return erroApi(400, MENSAGENS_AUTH.TOKEN_INVALIDO, caminho);
  }
  usuario.senha = corpo.newPassword;
  // Encerra as sessões abertas e, se era convite, ele deixa de estar pendente.
  usuario.senhaAlteradaEmMs = instanteDaTroca(agoraMs);
  registro.usado = true;
  return ok(204);
}

/** Rotas públicas do AuthController (permitAll em /api/v1/auth/**). Não há /auth/refresh. */
export const ROTAS_AUTH = Object.freeze([
  { metodo: 'post', padrao: /^\/auth\/login$/, publica: true, corpo: { ilegivel: corpoIlegivel, validar: validarLoginRequest }, executar: login },
  {
    metodo: 'post',
    padrao: /^\/auth\/forgot-password$/,
    publica: true,
    corpo: { ilegivel: corpoIlegivel, validar: validarForgotPasswordRequest },
    executar: esqueciSenha,
  },
  {
    metodo: 'post',
    padrao: /^\/auth\/reset-password$/,
    publica: true,
    corpo: { ilegivel: corpoIlegivel, validar: validarResetPasswordRequest },
    executar: redefinirSenha,
  },
]);
