import { useState } from 'react';
import { classificarFalhaExclusao, FALHAS_EXCLUSAO } from '../schemas/exclusaoMembro';
import { membrosService } from '../services/members/membrosService';

/**
 * Etapas do diálogo de exclusão.
 * RN14, Fase 2: quando o backend permitir excluir membro com histórico mediante confirmação
 * administrativa, o 409 deixa de ser beco sem saída — entra aqui uma etapa
 * CONFIRMACAO_ADMINISTRATIVA (com sua chamada própria no membrosService) no lugar de
 * BLOQUEADO_HISTORICO, e o ExcluirMembroDialog ganha a tela correspondente.
 */
export const ETAPAS_EXCLUSAO = Object.freeze({
  CONFIRMAR: 'confirmar',
  BLOQUEADO_HISTORICO: 'bloqueado-historico',
});

/** Estado e ação do diálogo. onExcluido(membro) no sucesso; onMembroRemovido() se já não existia (404). */
export function useExclusaoMembro(membro, { onExcluido, onMembroRemovido }) {
  const [etapa, setEtapa] = useState(ETAPAS_EXCLUSAO.CONFIRMAR);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState(null);

  async function confirmar() {
    if (processando) return;
    setProcessando(true);
    setErro(null);
    try {
      await membrosService.excluir(membro.id);
      onExcluido(membro);
    } catch (falha) {
      setProcessando(false);
      const tipo = classificarFalhaExclusao(falha);
      if (tipo === FALHAS_EXCLUSAO.REMOVIDO) onMembroRemovido();
      else if (tipo === FALHAS_EXCLUSAO.HISTORICO_FINANCEIRO) {
        setErro(falha.message);
        setEtapa(ETAPAS_EXCLUSAO.BLOQUEADO_HISTORICO);
      } else if (tipo === FALHAS_EXCLUSAO.ERRO) setErro(falha.message);
    }
  }

  return { etapa, processando, erro, confirmar };
}
