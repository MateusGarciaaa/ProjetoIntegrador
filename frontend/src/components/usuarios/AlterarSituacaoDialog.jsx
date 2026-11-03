import { useState } from 'react';
import { TIPOS_ERRO } from '../../services/http/apiError';
import { usuariosService } from '../../services/usuarios/usuariosService';
import { ConfirmDialog } from '../ui/ConfirmDialog';

/**
 * Desativar (sem exclusão física) ou reativar um usuário, sempre confirmado. Os 409 do backend
 * (a própria conta, o último Administrador ativo) aparecem no diálogo; 404 avisa e fecha.
 * onConcluido(usuarioAtualizado) no sucesso; onUsuarioRemovido() se ele não existe mais.
 */
export function AlterarSituacaoDialog({ usuario, onFechar, onConcluido, onUsuarioRemovido }) {
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState(null);
  const desativar = usuario.ativo;

  async function confirmar() {
    if (processando) return;
    setProcessando(true);
    setErro(null);
    try {
      const atualizado = desativar ? await usuariosService.desativar(usuario.id) : await usuariosService.ativar(usuario.id);
      onConcluido(atualizado);
    } catch (falha) {
      setProcessando(false);
      if (falha.isFimDeSessao?.()) return;
      if (falha.tipo === TIPOS_ERRO.NAO_ENCONTRADO) onUsuarioRemovido();
      else setErro(falha.message);
    }
  }

  return (
    <ConfirmDialog
      aberto
      titulo={desativar ? 'Desativar usuário' : 'Ativar usuário'}
      rotuloConfirmar={desativar ? 'Desativar' : 'Ativar'}
      varianteConfirmar={desativar ? 'perigo' : 'primario'}
      processando={processando}
      erro={erro}
      onConfirmar={confirmar}
      onCancelar={onFechar}
    >
      {desativar ? (
        <p>
          Desativar <strong>{usuario.nome}</strong>? A pessoa perde o acesso na hora, inclusive nas sessões já abertas. O cadastro
          continua e pode ser reativado depois.
        </p>
      ) : (
        <p>
          Ativar <strong>{usuario.nome}</strong>?{' '}
          {usuario.convitePendente
            ? 'O convite ainda não foi aceito: depois de ativar, reenvie o convite.'
            : 'A pessoa volta a entrar com a senha que já tinha.'}
        </p>
      )}
    </ConfirmDialog>
  );
}
