import { TIPOS_ERRO } from '../services/http/apiError';

/** O que fazer quando o DELETE /members/{id} falha. */
export const FALHAS_EXCLUSAO = Object.freeze({
  /** 401/sessão vencida: o app já leva ao login; o diálogo não mostra nada. */
  FIM_DE_SESSAO: 'fim-de-sessao',
  /** 404: alguém excluiu antes; a lista é recarregada. */
  REMOVIDO: 'removido',
  /** 409 (RN14): o membro tem movimentações financeiras e o backend recusa a exclusão. */
  HISTORICO_FINANCEIRO: 'historico-financeiro',
  /** Qualquer outro erro: mensagem no diálogo, que continua aberto para tentar de novo. */
  ERRO: 'erro',
});

export function classificarFalhaExclusao(erro) {
  if (erro.isFimDeSessao?.()) return FALHAS_EXCLUSAO.FIM_DE_SESSAO;
  if (erro.tipo === TIPOS_ERRO.NAO_ENCONTRADO) return FALHAS_EXCLUSAO.REMOVIDO;
  // O único 409 do DELETE é o da RN14 (MembroService.excluir).
  if (erro.status === 409) return FALHAS_EXCLUSAO.HISTORICO_FINANCEIRO;
  return FALHAS_EXCLUSAO.ERRO;
}
