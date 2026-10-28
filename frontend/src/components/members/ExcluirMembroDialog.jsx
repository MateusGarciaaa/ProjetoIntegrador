import { PERMISSOES } from '../../constants/permissoes';
import { caminhoEdicaoMembro } from '../../constants/rotas';
import { ETAPAS_EXCLUSAO, useExclusaoMembro } from '../../hooks/useExclusaoMembro';
import { usePermissao } from '../../hooks/usePermissao';
import { Alert } from '../ui/Alert';
import { Button, ButtonLink } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';

/** RN14: o backend recusou porque o membro tem movimentações financeiras. */
function ExclusaoBloqueada({ membro, mensagem, onFechar }) {
  const { pode } = usePermissao();
  return (
    <Modal
      aberto
      titulo="Não é possível excluir"
      tamanho="pequeno"
      onFechar={onFechar}
      rodape={
        <>
          <Button variante="secundario" onClick={onFechar} data-autofocus>
            Entendi
          </Button>
          {pode(PERMISSOES.MEMBROS_EDITAR) && <ButtonLink to={caminhoEdicaoMembro(membro.id)}>Alterar status</ButtonLink>}
        </>
      }
    >
      <Alert tom="aviso">{mensagem}</Alert>
      <p>
        <strong>{membro.nome}</strong> continua no cadastro.
      </p>
    </Modal>
  );
}

/** Exclusão sempre confirmada, com o nome do membro na mensagem. Usado na lista e nos detalhes. */
export function ExcluirMembroDialog({ membro, onFechar, onExcluido, onMembroRemovido }) {
  const { etapa, processando, erro, confirmar } = useExclusaoMembro(membro, { onExcluido, onMembroRemovido });

  if (etapa === ETAPAS_EXCLUSAO.BLOQUEADO_HISTORICO) {
    return <ExclusaoBloqueada membro={membro} mensagem={erro} onFechar={onFechar} />;
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
