/** Espelho do enum StatusMembro. */
export const STATUS_MEMBRO = Object.freeze({
  ATIVO: 'ATIVO',
  AFASTADO: 'AFASTADO',
  VISITANTE: 'VISITANTE',
});

/** O MembroMapper grava ATIVO quando o status chega nulo; o formulário já começa assim. */
export const STATUS_PADRAO = STATUS_MEMBRO.ATIVO;

export const OPCOES_STATUS = Object.freeze([
  { valor: STATUS_MEMBRO.ATIVO, rotulo: 'Ativo', tom: 'sucesso' },
  { valor: STATUS_MEMBRO.AFASTADO, rotulo: 'Afastado', tom: 'aviso' },
  { valor: STATUS_MEMBRO.VISITANTE, rotulo: 'Visitante', tom: 'info' },
]);

export function infoStatus(status) {
  return OPCOES_STATUS.find((opcao) => opcao.valor === status) ?? { valor: status, rotulo: status ?? '—', tom: 'neutro' };
}

export function isStatusValido(status) {
  return OPCOES_STATUS.some((opcao) => opcao.valor === status);
}
