import { useState } from 'react';
import { TIPOS_ERRO } from '../../services/http/apiError';
import { eventosService } from '../../services/events/eventosService';
import { formatarData, formatarHorario } from '../../utils/datas';
import { ConfirmDialog } from '../ui/ConfirmDialog';

/**
 * Exclusão sempre confirmada, com título, data e horário do evento. Usado na lista e nos detalhes.
 * onExcluido() no sucesso; onEventoRemovido() se ele já não existia (404).
 */
export function ExcluirEventoDialog({ evento, onFechar, onExcluido, onEventoRemovido }) {
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState(null);

  async function confirmar() {
    if (processando) return;
    setProcessando(true);
    setErro(null);
    try {
      await eventosService.excluir(evento.id);
      onExcluido(evento);
    } catch (falha) {
      setProcessando(false);
      if (falha.isFimDeSessao?.()) return;
      if (falha.tipo === TIPOS_ERRO.NAO_ENCONTRADO) onEventoRemovido();
      else setErro(falha.message);
    }
  }

  return (
    <ConfirmDialog
      aberto
      titulo="Excluir evento"
      rotuloConfirmar="Excluir evento"
      processando={processando}
      erro={erro}
      onConfirmar={confirmar}
      onCancelar={onFechar}
    >
      <p>
        Excluir <strong>{evento.titulo}</strong> ({formatarData(evento.data)} às {formatarHorario(evento.horario)})? Esta ação não
        pode ser desfeita.
      </p>
    </ConfirmDialog>
  );
}
