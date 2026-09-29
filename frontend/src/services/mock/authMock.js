import { ROLES } from '../../constants/roles';
import { ApiError } from '../http/apiError';
import { createFakeJwt } from './fakeJwt';
import { simulateLatency } from './simulateLatency';

const SESSION_DURATION_SECONDS = 8 * 60 * 60;

export const MOCK_PASSWORD = 'demo123';

export const MOCK_USERS = Object.freeze([
  { email: 'admin@igreja.com', name: 'Ana Ribeiro', role: ROLES.ADMIN },
  { email: 'secretaria@igreja.com', name: 'Sara Moura', role: ROLES.SECRETARIO },
  { email: 'pastor@igreja.com', name: 'Paulo Andrade', role: ROLES.PASTOR },
]);

export const authMock = {
  async login({ email, password }) {
    await simulateLatency();
    const user = MOCK_USERS.find((candidate) => candidate.email === email.trim().toLowerCase());

    if (!user || password !== MOCK_PASSWORD) {
      throw new ApiError({ status: 401, message: 'E-mail ou senha incorretos.' });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
    const token = createFakeJwt({ sub: user.email, name: user.name, role: user.role, exp: expiresAt });
    return { token, expiresIn: SESSION_DURATION_SECONDS };
  },
};
