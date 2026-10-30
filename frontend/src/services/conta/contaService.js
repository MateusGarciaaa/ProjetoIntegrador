import { httpClient } from '../http/httpClient';

/** "Minha conta" (MeController): qualquer usuário autenticado, sobre a própria conta. */
export const contaService = {
  /** GET /me: { id, nome, email, perfil } atuais do banco (o nome pode ter mudado depois do login). */
  async buscar({ signal } = {}) {
    const { data } = await httpClient.get('/me', { signal });
    return data;
  },

  /**
   * PUT /me/password com { currentPassword, newPassword } (AlterarSenhaRequest). Devolve o
   * LoginResponse com o token novo: a troca derruba os tokens anteriores, inclusive o atual.
   */
  async alterarSenha({ currentPassword, newPassword }) {
    const { data } = await httpClient.put('/me/password', { currentPassword, newPassword });
    return data;
  },
};
