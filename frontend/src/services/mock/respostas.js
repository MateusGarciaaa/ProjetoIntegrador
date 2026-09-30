const FRASES_HTTP = Object.freeze({
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
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

/** Sem authenticationEntryPoint, o Spring Security responde 403 sem corpo. */
export function recusaSemCorpo() {
  return { status: 403, data: '' };
}

/** Qualquer exceção não tratada cai no handler genérico do GlobalExceptionHandler. */
export function erroInterno(caminho) {
  return erroApi(500, 'Ocorreu um erro interno no servidor.', caminho);
}
