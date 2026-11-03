import { PERFIS } from '../../../constants/perfis';
import { emitirTokenFalso } from '../mockJwt';
import { erroApi, ok } from '../respostas';
import { corpoIlegivel, emBranco, excedeBcrypt, instanteDaTroca, invalidarLinksPendentes, MENSAGEM_BCRYPT } from './auth';

export const MENSAGENS_CONTA = Object.freeze({
  SENHA_ATUAL_INCORRETA: 'A senha atual está incorreta',
  SENHA_REPETIDA: 'A nova senha deve ser diferente da atual',
});

/** Mensagens das anotações do AlterarSenhaRequest (as da nova senha são as do ResetPasswordRequest). */
function validarAlterarSenhaRequest({ currentPassword, newPassword }) {
  const erros = [];
  if (emBranco(currentPassword)) erros.push('A senha atual é obrigatória');
  if (excedeBcrypt(currentPassword)) erros.push(`A senha atual ${MENSAGEM_BCRYPT}`);
  if (emBranco(newPassword)) erros.push('A nova senha é obrigatória');
  if (typeof newPassword === 'string' && (newPassword.length < 6 || newPassword.length > 72)) {
    erros.push('A nova senha deve ter entre 6 e 72 caracteres');
  }
  if (excedeBcrypt(newPassword)) erros.push(`A nova senha ${MENSAGEM_BCRYPT}`);
  return erros;
}

/** GET /me: MeResponse. */
function buscar({ usuario }) {
  return ok(200, { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil });
}

/**
 * ContaService.alterarSenha: senha atual errada → 400 (não 401); nova igual à atual → 400. No sucesso,
 * grava o instante da troca (derruba os tokens anteriores), invalida os links e devolve um token novo.
 */
function alterarSenha({ banco, usuario, corpo, caminho, agoraMs, validadeSegundos }) {
  if (corpo.currentPassword !== usuario.senha) return erroApi(400, MENSAGENS_CONTA.SENHA_ATUAL_INCORRETA, caminho);
  if (corpo.newPassword === usuario.senha) return erroApi(400, MENSAGENS_CONTA.SENHA_REPETIDA, caminho);

  usuario.senha = corpo.newPassword;
  usuario.senhaAlteradaEmMs = instanteDaTroca(agoraMs);
  invalidarLinksPendentes(banco, usuario);
  const token = emitirTokenFalso({ email: usuario.email, nome: usuario.nome, perfil: usuario.perfil, agoraMs, validadeSegundos });
  return ok(200, { token, type: 'Bearer', expiresIn: validadeSegundos });
}

const TODOS = Object.values(PERFIS);

/** MeController: isAuthenticated() nas duas rotas. */
export const ROTAS_CONTA = Object.freeze([
  { metodo: 'get', padrao: /^\/me$/, perfis: TODOS, executar: buscar },
  {
    metodo: 'put',
    padrao: /^\/me\/password$/,
    perfis: TODOS,
    corpo: { ilegivel: corpoIlegivel, validar: validarAlterarSenhaRequest },
    executar: alterarSenha,
  },
]);
