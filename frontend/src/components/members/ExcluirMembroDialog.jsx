import { useState } from 'react';
import { TIPOS_ERRO } from '../../services/http/apiError';
import { membrosService } from '../../services/members/membrosService';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export function ExcluirMembroDialog({ membro, onFechar, onExcluido, onMembroRemovido }) {
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState(null);

  async function confirmar() {
    setProcessando(true);
    setErro(null);
    try {
      await membrosService.excluir(membro.id);
      onExcluido(membro);
    } catch (falha) {
      setProcessando(false);
      if (falha.isFimDeSessao?.()) return;
      if (falha.tipo === TIPOS_ERRO.NAO_ENCONTRADO) {
        onMembroRemovido();
        return;
      }
      setErro(falha.message);
    }
  }

  return (
    <ConfirmDialog
      aberto
      titulo="Excluir membro"
      rotuloConfirmar="Excluir membro"
      processando={processando}
      erro={erro}
      onConfirmar={confirmar}
      onCancelar={onFechar}
    >
      <p>
        Excluir <strong>{membro.nome}</strong> do cadastro? Esta ação não pode ser desfeita.
      </p>
    </ConfirmDialog>
  );
}
