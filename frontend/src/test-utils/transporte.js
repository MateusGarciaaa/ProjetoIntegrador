import { AxiosError } from 'axios';
import { vi } from 'vitest';
import { httpClient } from '../services/http/httpClient';

/** Corpo no formato do ApiError do GlobalExceptionHandler. */
export function corpoApi(status, message, path) {
  return { timestamp: '2026-10-26T10:00:00.123456', status, error: 'Erro', message, path };
}

/** Resposta HTTP simulada; status >= 400 vira AxiosError, como no axios real. */
export function resposta(status, data = '') {
  return (config) => {
    const saida = { data, status, statusText: '', headers: {}, config, request: {} };
    if (status < 400) return Promise.resolve(saida);
    return Promise.reject(new AxiosError(`Status ${status}`, AxiosError.ERR_BAD_REQUEST, config, {}, saida));
  };
}

export function falhaDeRede() {
  return (config) => Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, {}));
}

/**
 * Troca só o transporte do httpClient: serviços, interceptores e conversão para ApiError
 * continuam os reais. Devolve o vi.fn (para conferir as chamadas) e a função que restaura.
 */
export function instalarTransporte(responder) {
  const original = httpClient.defaults.adapter;
  const adapter = vi.fn(responder);
  httpClient.defaults.adapter = adapter;
  return {
    adapter,
    corpoEnviado: (indice = 0) => JSON.parse(adapter.mock.calls[indice][0].data),
    restaurar: () => {
      httpClient.defaults.adapter = original;
    },
  };
}

/**
 * Transporte que responde com o servidor simulado (services/mock), sem a latência do modo
 * demonstração: os testes de tela exercitam o mesmo contrato do backend real.
 */
export function transporteDoServidor(atender) {
  return (config) => {
    const { status, data } = atender({
      metodo: (config.method ?? 'get').toLowerCase(),
      url: config.url ?? '',
      params: config.params ?? {},
      corpo: config.data ? JSON.parse(config.data) : null,
      authorization: config.headers?.get?.('Authorization') ?? config.headers?.Authorization ?? null,
    });
    return resposta(status, data)(config);
  };
}
