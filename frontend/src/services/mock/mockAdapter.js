import { AxiosError, CanceledError } from 'axios';
import { appConfig } from '../../config/env';
import { fraseHttp } from './respostas';
import { criarServidorSimulado } from './servidorSimulado';

const LATENCIA_MINIMA_MS = 250;
const LATENCIA_MAXIMA_MS = 650;

const atender = criarServidorSimulado({ validadeTokenSegundos: appConfig.mockTokenExpiresInSeconds });

function aguardar(config) {
  const atraso = LATENCIA_MINIMA_MS + Math.random() * (LATENCIA_MAXIMA_MS - LATENCIA_MINIMA_MS);
  return new Promise((resolve, reject) => {
    const cancelar = () => {
      clearTimeout(timer);
      reject(new CanceledError(undefined, undefined, config));
    };
    const timer = setTimeout(() => {
      config.signal?.removeEventListener?.('abort', cancelar);
      resolve();
    }, atraso);
    if (config.signal?.aborted) cancelar();
    else config.signal?.addEventListener?.('abort', cancelar, { once: true });
  });
}

function lerCorpo(data) {
  if (data == null || data === '') return { corpo: null, corpoMalformado: false };
  if (typeof data !== 'string') return { corpo: data, corpoMalformado: false };
  try {
    return { corpo: JSON.parse(data), corpoMalformado: false };
  } catch {
    return { corpo: null, corpoMalformado: true };
  }
}

/** Adaptador do axios: o app faz requisições normais e quem responde é o servidor simulado. */
export async function mockAdapter(config) {
  await aguardar(config);

  const { corpo, corpoMalformado } = lerCorpo(config.data);
  const { status, data } = atender({
    metodo: (config.method ?? 'get').toLowerCase(),
    url: config.url ?? '',
    params: config.params ?? {},
    corpo,
    corpoMalformado,
    authorization: config.headers?.get?.('Authorization') ?? config.headers?.Authorization ?? null,
  });

  const resposta = {
    data,
    status,
    statusText: fraseHttp(status),
    headers: { 'content-type': data === '' ? 'text/plain' : 'application/json' },
    config,
    request: {},
  };

  if (status >= 200 && status < 300) return resposta;
  throw new AxiosError(
    `Request failed with status code ${status}`,
    status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    config,
    resposta.request,
    resposta,
  );
}
