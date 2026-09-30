import axios from 'axios';
import { appConfig } from '../../config/env';
import { encerrarSessao, lerSessao, MOTIVOS_FIM_SESSAO } from '../auth/sessionStore';
import { ApiError, MENSAGENS_ERRO, TIPOS_ERRO } from './apiError';

/** Espelha o permitAll("/api/v1/auth/**") do SecurityConfig. */
const PREFIXOS_PUBLICOS = ['/auth/'];

function isRotaPublica(url = '') {
  return PREFIXOS_PUBLICOS.some((prefixo) => url.startsWith(prefixo));
}

export const httpClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: appConfig.requestTimeoutMs,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

if (appConfig.useMockApi) {
  // Import dinâmico: o backend simulado vira um arquivo separado, só baixado no modo demonstração.
  httpClient.defaults.adapter = async (config) => {
    const { mockAdapter } = await import('../mock/mockAdapter');
    return mockAdapter(config);
  };
}

httpClient.interceptors.request.use((config) => {
  // O JwtAuthenticationFilter roda até em rotas públicas: um token vencido
  // enviado no login derrubaria a requisição. Por isso, nada de Authorization aqui.
  if (isRotaPublica(config.url)) return config;

  const sessao = lerSessao();
  if (!sessao) {
    encerrarSessao(MOTIVOS_FIM_SESSAO.EXPIRADA);
    return Promise.reject(
      new ApiError({ tipo: TIPOS_ERRO.SESSAO_EXPIRADA, status: 401, message: MENSAGENS_ERRO.SESSAO_EXPIRADA }),
    );
  }
  config.headers.Authorization = `Bearer ${sessao.token}`;
  return config;
});

httpClient.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const apiError = ApiError.from(erro);
    // Na rota de login, 401 é "credenciais inválidas" e vira mensagem no formulário.
    if (apiError.isSessaoRecusada() && !isRotaPublica(erro?.config?.url)) {
      encerrarSessao(MOTIVOS_FIM_SESSAO.RECUSADA);
    }
    return Promise.reject(apiError);
  },
);
