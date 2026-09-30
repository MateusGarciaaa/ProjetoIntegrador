const env = import.meta.env;

function lerBooleano(valor) {
  return String(valor ?? '').trim().toLowerCase() === 'true';
}

function lerInteiroPositivo(valor, padrao) {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero > 0 ? numero : padrao;
}

/** Configuração lida uma única vez; o restante do app nunca acessa import.meta.env. */
export const appConfig = Object.freeze({
  apiBaseUrl: (env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, ''),
  useMockApi: lerBooleano(env.VITE_USE_MOCK_API),
  mockTokenExpiresInSeconds: lerInteiroPositivo(env.VITE_MOCK_TOKEN_EXPIRES_IN, 86400),
  requestTimeoutMs: 15000,
});
