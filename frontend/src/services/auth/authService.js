import { httpClient } from '../http/httpClient';
import { ApiError, MENSAGENS_ERRO, TIPOS_ERRO } from '../http/apiError';
import { criarSessao } from './sessao';

export const authService = {
  /**
   * POST /auth/login com { email, password } (nomes do LoginRequest).
   * O e-mail só perde os espaços: o backend compara e-mail diferenciando maiúsculas.
   */
  async entrar({ email, password }) {
    const { data } = await httpClient.post('/auth/login', { email: email.trim(), password });
    const sessao = criarSessao(data);
    if (!sessao) {
      throw new ApiError({ tipo: TIPOS_ERRO.RESPOSTA_INVALIDA, message: MENSAGENS_ERRO.RESPOSTA_INVALIDA });
    }
    return sessao;
  },
};
