import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CargaDoMembro } from '../components/members/CargaDoMembro';
import { ExcluirMembroDialog } from '../components/members/ExcluirMembroDialog';
import { MembroAcoes } from '../components/members/MembroAcoes';
import { MembroDetalhes } from '../components/members/MembroDetalhes';
import { ButtonLink } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { PERMISSOES } from '../constants/permissoes';
import { useMembro } from '../hooks/useMembro';
import { usePermissao } from '../hooks/usePermissao';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { useToast } from '../hooks/useToast';
import { useVoltarParaLista } from '../hooks/useVoltarParaLista';
import styles from './MembroPaginas.module.css';

export function MembroDetalhesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { pode } = usePermissao();
  const { voltarPara, estado } = useVoltarParaLista();
  const { membro, erro, naoEncontrado, recarregar } = useMembro(id);
  const [excluindo, setExcluindo] = useState(false);
  useTituloPagina(membro?.nome ?? 'Membro');

  function voltarComAviso(notificar, mensagem) {
    notificar(mensagem);
    navigate(voltarPara, { replace: true });
  }

  const voltar = (
    <ButtonLink variante="fantasma" pequeno icone="voltar" to={voltarPara} className={styles.voltar}>
      Voltar para a lista
    </ButtonLink>
  );

  if (!membro) {
    return (
      <>
        {voltar}
        <CargaDoMembro erro={erro} naoEncontrado={naoEncontrado} recarregar={recarregar} voltarPara={voltarPara} />
      </>
    );
  }

  return (
    <>
      {voltar}
      <PageHeader
        titulo={membro.nome}
        descricao="Dados cadastrais do membro."
        acoes={
          <div className={styles.acoes}>
            <MembroAcoes
              membro={membro}
              pequeno={false}
              podeEditar={pode(PERMISSOES.MEMBROS_EDITAR)}
              podeExcluir={pode(PERMISSOES.MEMBROS_EXCLUIR)}
              onExcluir={() => setExcluindo(true)}
              estado={estado}
            />
          </div>
        }
      />
      <MembroDetalhes membro={membro} />

      {excluindo && (
        <ExcluirMembroDialog
          membro={membro}
          onFechar={() => setExcluindo(false)}
          onExcluido={() => voltarComAviso(toast.sucesso, 'Membro excluído.')}
          onMembroRemovido={() => voltarComAviso(toast.aviso, 'Este membro não está mais no cadastro.')}
        />
      )}
    </>
  );
}
