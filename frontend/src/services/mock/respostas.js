const FRASES_HTTP = Object.freeze({
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  500: 'Internal Server Error',
});

const PREFIXO_API = '/api/v1';

export function fraseHttp(status) {
  return FRASES_HTTP[status] ?? '';
}

export function ok(status, data = '') {
  return { status, data };
}

/** Mesmo formato do record ApiError. */
export function erroApi(status, message, caminho) {
  return {
    status,
    data: {
      timestamp: new Date().toISOString().slice(0, 23),
      status,
      error: fraseHttp(status),
      message,
      path: `${PREFIXO_API}${caminho}`,
    },
  };
}

export const MENSAGENS_BACKEND = Object.freeze({
  NAO_AUTENTICADO: 'Sessão inválida ou expirada. Faça login novamente.',
  // SituacaoToken: token autêntico, mas a senha ou o perfil mudaram depois da emissão.
  SENHA_ALTERADA: 'Sua senha foi alterada. Entre novamente.',
  PERFIL_ALTERADO: 'Seu acesso foi alterado. Entre novamente.',
  CORPO_INVALIDO: 'Corpo da requisição inválido. Confira o JSON, as datas (AAAA-MM-DD) e os valores permitidos.',
  RECURSO_INEXISTENTE: 'Recurso não encontrado.',
});

/** Token ausente, inválido ou vencido (ou recusado com motivo): SecurityErrorHandler → GlobalExceptionHandler. */
export function naoAutenticado(caminho, motivo = null) {
  return erroApi(401, motivo ?? MENSAGENS_BACKEND.NAO_AUTENTICADO, caminho);
}

/** HttpMessageNotReadableException: JSON malformado, data ou enum inválidos. */
export function corpoInvalido(caminho) {
  return erroApi(400, MENSAGENS_BACKEND.CORPO_INVALIDO, caminho);
}
