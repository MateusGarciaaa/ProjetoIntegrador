import { useState } from 'react';
import { TIPOS_ERRO } from '../../services/http/apiError';
import { financeiroService } from '../../services/financial/financeiroService';
import { formatarData } from '../../utils/datas';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ValorMovimentacao } from './ValorMovimentacao';

/**
 * Exclusão sempre confirmada, com descrição, data e valor (só o Administrador exclui).
 * onExcluida() no sucesso; onRemovida() se ela já não existia (404).
 * RN05 (Fase 2): quando existir a conciliação, a movimentação conciliada não poderá ser excluída.
 */
export function ExcluirMovimentacaoDialog({ movimentacao, onFechar, onExcluida, onRemovida }) {
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState(null);

  async function confirmar() {
    if (processando) return;
    setProcessando(true);
    setErro(null);
    try {
      await financeiroService.excluir(movimentacao.id);
      onExcluida(movimentacao);
    } catch (falha) {
      setProcessando(false);
      if (falha.isFimDeSessao?.()) return;
      if (falha.tipo === TIPOS_ERRO.NAO_ENCONTRADO) onRemovida();
      else setErro(falha.message);
    }
  }

  return (
    <ConfirmDialog
      aberto
      titulo="Excluir movimentação"
      rotuloConfirmar="Excluir movimentação"
      processando={processando}
      erro={erro}
      onConfirmar={confirmar}
      onCancelar={onFechar}
    >
      <p>
        Excluir <strong>{movimentacao.descricao}</strong> de {formatarData(movimentacao.data)} (
        <ValorMovimentacao tipo={movimentacao.tipo} valor={movimentacao.valor} />
        )? Esta ação não pode ser desfeita e muda os totais do período.
      </p>
    </ConfirmDialog>
  );
}
