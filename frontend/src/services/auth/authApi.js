import { httpClient } from '../http/httpClient';

export const authApi = {
  async login({ email, password }) {
    const { data } = await httpClient.post('/auth/login', { email, password });
    return { token: data.token, expiresIn: data.expiresIn };
  },
};
