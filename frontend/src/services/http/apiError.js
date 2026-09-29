const NETWORK_ERROR_STATUS = 0;

const DEFAULT_MESSAGES = Object.freeze({
  [NETWORK_ERROR_STATUS]: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
  400: 'Alguns dados enviados são inválidos. Revise os campos e tente novamente.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Seu perfil não tem permissão para esta ação.',
  404: 'O registro não foi encontrado. Ele pode ter sido excluído.',
  409: 'Já existe um registro com esses dados.',
});
const FALLBACK_MESSAGE = 'Ocorreu um erro inesperado no servidor. Tente novamente em instantes.';

export class ApiError extends Error {
  constructor({ status, message, fieldErrors = {} }) {
    super(message ?? DEFAULT_MESSAGES[status] ?? FALLBACK_MESSAGE);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get hasFieldErrors() {
    return Object.keys(this.fieldErrors).length > 0;
  }
}

// Formato de erro esperado do @ControllerAdvice:
// { "status": 409, "message": "...", "errors": [{ "field": "email", "message": "..." }] }
export function toApiError(axiosError) {
  if (!axiosError.response) {
    return new ApiError({ status: NETWORK_ERROR_STATUS });
  }

  const { status, data } = axiosError.response;
  return new ApiError({
    status,
    message: data?.message,
    fieldErrors: toFieldErrorMap(data?.errors),
  });
}

function toFieldErrorMap(errors) {
  if (!Array.isArray(errors)) return {};
  return Object.fromEntries(errors.map(({ field, message }) => [field, message]));
}
