import axios from 'axios';
import { appConfig } from '../../config/env';
import { encerrarSessao, lerSessao, MOTIVOS_FIM_SESSAO } from '../auth/sessionStore';
import { ApiError, MENSAGENS_ERRO, TIPOS_ERRO } from './apiError';

/** Espelha o permitAll("/api/v1/auth/**") do SecurityConfig. */
const PREFIXOS_PUBLICOS = ['/auth/'];

function isRotaPublica(url = '') {
  return PREFIXOS_PUBLICOS.some((prefixo) => url.startsWith(prefixo));
}

/** Interceptor de requisição: anexa "Authorization: Bearer <token>" em toda rota protegida. */
export function anexarToken(config) {
  // Rotas públicas não precisam de token; enviar um token vencido ali só polui a requisição.
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
}

/**
 * Interceptor de resposta: todo erro vira ApiError. Sessão recusada (401 fora do login)
 * encerra a sessão; o ProtectedRoute então leva ao login guardando a rota de origem.
 * 403 com corpo (perfil sem permissão) só vira mensagem: o usuário continua logado.
 * O backend não tem POST /auth/refresh; quando tiver, a renovação entra aqui, antes do encerramento.
 */
export function tratarErroResposta(erro) {
  const apiError = ApiError.from(erro);
  // Na rota de login, 401 é "credenciais inválidas" e vira mensagem no formulário.
  if (apiError.isSessaoRecusada() && !isRotaPublica(erro?.config?.url)) {
    encerrarSessao(MOTIVOS_FIM_SESSAO.RECUSADA);
  }
  return Promise.reject(apiError);
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

httpClient.interceptors.request.use(anexarToken);
httpClient.interceptors.response.use((resposta) => resposta, tratarErroResposta);
