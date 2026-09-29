const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1';

function toBoolean(value) {
  return String(value).toLowerCase() === 'true';
}

export const env = Object.freeze({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  useMockApi: toBoolean(import.meta.env.VITE_USE_MOCK_API),
});
