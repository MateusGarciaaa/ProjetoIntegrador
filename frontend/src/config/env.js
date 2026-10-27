const env = import.meta.env;

function lerBooleano(valor) {
  return String(valor ?? '').trim().toLowerCase() === 'true';
}

function lerInteiroPositivo(valor, padrao) {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero > 0 ? numero : padrao;
}

const useMockApi = lerBooleano(env.VITE_USE_MOCK_API);

/** Configuração lida uma única vez; o restante do app nunca acessa import.meta.env. */
export const appConfig = Object.freeze({
  apiBaseUrl: (env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, ''),
  useMockApi,
  mockTokenExpiresInSeconds: lerInteiroPositivo(env.VITE_MOCK_TOKEN_EXPIRES_IN, 86400),
  // Servidores gratuitos "dormem" e levam ~1 min para acordar: em produção, use 90000.
  requestTimeoutMs: lerInteiroPositivo(env.VITE_API_TIMEOUT_MS, 15000),
  // No modo simulado as contas sempre aparecem; com o backend real, só em ambiente de apresentação.
  exibirContasDemo: useMockApi || lerBooleano(env.VITE_SHOW_DEMO_ACCOUNTS),
});
