import axios from 'axios';

export const TIPOS_ERRO = Object.freeze({
  REDE: 'rede',
  TEMPO_ESGOTADO: 'tempo-esgotado',
  CANCELADO: 'cancelado',
  VALIDACAO: 'validacao',
  NAO_AUTENTICADO: 'nao-autenticado',
  SESSAO_EXPIRADA: 'sessao-expirada',
  SEM_PERMISSAO: 'sem-permissao',
  NAO_ENCONTRADO: 'nao-encontrado',
  CONFLITO: 'conflito',
  SERVIDOR: 'servidor',
  RESPOSTA_INVALIDA: 'resposta-invalida',
  DESCONHECIDO: 'desconhecido',
});

export const MENSAGENS_ERRO = Object.freeze({
  REDE: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
  TEMPO_ESGOTADO: 'O servidor demorou para responder. Tente novamente.',
  CANCELADO: 'A requisição foi cancelada.',
  VALIDACAO: 'Confira os dados informados.',
  NAO_AUTENTICADO: 'Sua sessão não é mais válida. Entre novamente.',
  SESSAO_EXPIRADA: 'Sua sessão expirou. Entre novamente.',
  SEM_PERMISSAO: 'Seu perfil não tem permissão para esta ação.',
  NAO_ENCONTRADO: 'O registro não foi encontrado.',
  CONFLITO: 'Já existe um registro com esses dados.',
  SERVIDOR: 'O servidor não conseguiu concluir a operação. Tente novamente em instantes.',
  RESPOSTA_INVALIDA: 'O servidor enviou uma resposta inesperada.',
  DESCONHECIDO: 'Algo deu errado. Tente novamente.',
});

/** O GlobalExceptionHandler responde { timestamp, status, error, message, path }. */
function isCorpoApiError(dados) {
  return Boolean(dados) && typeof dados === 'object' && typeof dados.status === 'number' && typeof dados.message === 'string';
}

function porStatus(status, corpo) {
  const mensagemApi = corpo?.message?.trim() || null;

  if (status === 400) return { tipo: TIPOS_ERRO.VALIDACAO, message: mensagemApi ?? MENSAGENS_ERRO.VALIDACAO };
  if (status === 401) return { tipo: TIPOS_ERRO.NAO_AUTENTICADO, message: mensagemApi ?? MENSAGENS_ERRO.NAO_AUTENTICADO };
  // A mensagem do 403 é sempre a nossa: a do backend é genérica demais para a interface.
  if (status === 403) return { tipo: TIPOS_ERRO.SEM_PERMISSAO, message: MENSAGENS_ERRO.SEM_PERMISSAO };
  if (status === 404) return { tipo: TIPOS_ERRO.NAO_ENCONTRADO, message: mensagemApi ?? MENSAGENS_ERRO.NAO_ENCONTRADO };
  if (status === 409) return { tipo: TIPOS_ERRO.CONFLITO, message: mensagemApi ?? MENSAGENS_ERRO.CONFLITO };
  if (status >= 500) return { tipo: TIPOS_ERRO.SERVIDOR, message: MENSAGENS_ERRO.SERVIDOR };
  return { tipo: TIPOS_ERRO.DESCONHECIDO, message: mensagemApi ?? MENSAGENS_ERRO.DESCONHECIDO };
}

/** Único formato de erro que sai da camada de serviços. */
export class ApiError extends Error {
  constructor({ tipo, message, status = null, path = null, corpoApi = false }) {
    super(message);
    this.name = 'ApiError';
    this.tipo = tipo;
    this.status = status;
    this.path = path;
    this.corpoApi = corpoApi;
  }

  /**
   * O backend não tem authenticationEntryPoint: sem token válido ele responde 403
   * SEM corpo (padrão do Spring Security), e não 401. Já o 403 do @PreAuthorize
   * passa pelo GlobalExceptionHandler e traz corpo. É isso que separa
   * "sessão recusada" de "perfil sem permissão".
   */
  isSessaoRecusada() {
    return this.tipo === TIPOS_ERRO.NAO_AUTENTICADO || (this.tipo === TIPOS_ERRO.SEM_PERMISSAO && !this.corpoApi);
  }

  /** Erros em que o logout já foi disparado: a tela não precisa exibir nada. */
  isFimDeSessao() {
    return this.tipo === TIPOS_ERRO.SESSAO_EXPIRADA || this.isSessaoRecusada();
  }

  static from(erro) {
    if (erro instanceof ApiError) return erro;

    if (axios.isCancel(erro)) {
      return new ApiError({ tipo: TIPOS_ERRO.CANCELADO, message: MENSAGENS_ERRO.CANCELADO });
    }

    if (axios.isAxiosError(erro)) {
      const resposta = erro.response;
      if (!resposta) {
        const esgotado = erro.code === 'ECONNABORTED' || erro.code === 'ETIMEDOUT';
        return new ApiError({
          tipo: esgotado ? TIPOS_ERRO.TEMPO_ESGOTADO : TIPOS_ERRO.REDE,
          message: esgotado ? MENSAGENS_ERRO.TEMPO_ESGOTADO : MENSAGENS_ERRO.REDE,
        });
      }
      const corpo = isCorpoApiError(resposta.data) ? resposta.data : null;
      return new ApiError({
        ...porStatus(resposta.status, corpo),
        status: resposta.status,
        path: corpo?.path ?? null,
        corpoApi: Boolean(corpo),
      });
    }

    return new ApiError({ tipo: TIPOS_ERRO.DESCONHECIDO, message: MENSAGENS_ERRO.DESCONHECIDO });
  }
}
