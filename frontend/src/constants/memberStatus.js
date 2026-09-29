export const MEMBER_STATUS = Object.freeze({
  ATIVO: 'ATIVO',
  AFASTADO: 'AFASTADO',
  VISITANTE: 'VISITANTE',
});

export const MEMBER_STATUS_LABELS = Object.freeze({
  [MEMBER_STATUS.ATIVO]: 'Ativo',
  [MEMBER_STATUS.AFASTADO]: 'Afastado',
  [MEMBER_STATUS.VISITANTE]: 'Visitante',
});

export const MEMBER_STATUS_OPTIONS = Object.freeze(
  Object.values(MEMBER_STATUS).map((value) => ({ value, label: MEMBER_STATUS_LABELS[value] })),
);
