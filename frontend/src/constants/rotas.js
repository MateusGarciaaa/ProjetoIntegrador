export const ROTAS = Object.freeze({
  INICIO: '/',
  LOGIN: '/login',
  MEMBROS: '/membros',
});

/** Para onde o usuário vai quando não há um destino anterior. */
export const ROTA_PADRAO_AUTENTICADA = ROTAS.MEMBROS;
