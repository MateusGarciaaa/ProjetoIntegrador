import { httpClient } from '../http/httpClient';
import { ApiError, MENSAGENS_ERRO, TIPOS_ERRO } from '../http/apiError';
import { criarSessao } from './sessao';

/** E-mails de usuário são gravados em minúsculas (UsuarioService). */
function normalizarEmail(email) {
  return email.trim().toLowerCase();
}

export const authService = {
  /**
   * POST /auth/login com { email, password } (nomes do LoginRequest).
   * O backend já normaliza o e-mail no login; normalizar aqui mantém o mesmo valor nos dois modos.
   */
  async entrar({ email, password }) {
    const { data } = await httpClient.post('/auth/login', { email: normalizarEmail(email), password });
    const sessao = criarSessao(data);
    if (!sessao) {
      throw new ApiError({ tipo: TIPOS_ERRO.RESPOSTA_INVALIDA, message: MENSAGENS_ERRO.RESPOSTA_INVALIDA });
    }
    return sessao;
  },

  /** POST /auth/forgot-password com { email }; o backend também normaliza (NormalizadorEmail). */
  async solicitarRedefinicao({ email }) {
    await httpClient.post('/auth/forgot-password', { email: normalizarEmail(email) });
  },

  /** POST /auth/reset-password com { token, newPassword } (ResetPasswordRequest); responde 204. */
  async redefinirSenha({ token, newPassword }) {
    await httpClient.post('/auth/reset-password', { token, newPassword });
  },
};
