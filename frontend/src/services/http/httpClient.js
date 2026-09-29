import axios from 'axios';
import { env } from '../../config/env';
import { sessionStore } from '../auth/sessionStore';
import { toApiError } from './apiError';

const REQUEST_TIMEOUT_MS = 15000;

let handleUnauthorized = () => {};

export function setUnauthorizedHandler(handler) {
  handleUnauthorized = handler;
}

export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use((config) => {
  const session = sessionStore.read();
  if (session) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error);
    const wasAuthenticatedRequest = Boolean(error.config?.headers?.Authorization);

    if (apiError.isUnauthorized && wasAuthenticatedRequest) {
      handleUnauthorized();
    }
    return Promise.reject(apiError);
  },
);
