import { env } from '../../config/env';
import { authApi } from './authApi';
import { authMock } from '../mock/authMock';

export const authService = env.useMockApi ? authMock : authApi;
export { sessionStore } from './sessionStore';
