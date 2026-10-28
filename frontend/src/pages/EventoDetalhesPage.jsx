import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CargaDoEvento } from '../components/events/CargaDoEvento';
import { EventoAcoes } from '../components/events/EventoAcoes';
import { EventoDetalhes } from '../components/events/EventoDetalhes';
import { ExcluirEventoDialog } from '../components/events/ExcluirEventoDialog';
import { Alert } from '../components/ui/Alert';
import { ButtonLink } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { PERMISSOES } from '../constants/permissoes';
import { ROTAS } from '../constants/rotas';
import { useAgora } from '../hooks/useAgora';
import { useEvento } from '../hooks/useEvento';
import { usePermissao } from '../hooks/usePermissao';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { useToast } from '../hooks/useToast';
import { useVoltarParaLista } from '../hooks/useVoltarParaLista';
import { isEventoEncerrado, situacaoEdicaoEvento } from '../schemas/regrasEvento';
import styles from './EventoPaginas.module.css';

export function EventoDetalhesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { perfil, pode } = usePermissao();
  const agora = useAgora();
  const { voltarPara, estado } = useVoltarParaLista(ROTAS.EVENTOS);
  const { evento, erro, naoEncontrado, recarregar } = useEvento(id);
  const [excluindo, setExcluindo] = useState(false);
  useTituloPagina(evento?.titulo ?? 'Evento');

  function voltarComAviso(notificar, mensagem) {
    notificar(mensagem);
    navigate(voltarPara, { replace: true });
  }

  const voltar = (
    <ButtonLink variante="fantasma" pequeno icone="voltar" to={voltarPara} className={styles.voltar}>
      Voltar para os eventos
    </ButtonLink>
  );

  if (!evento) {
    return (
      <>
        {voltar}
        <CargaDoEvento erro={erro} naoEncontrado={naoEncontrado} recarregar={recarregar} voltarPara={voltarPara} />
      </>
    );
  }

  const encerrado = isEventoEncerrado(evento, agora);
  const edicao = situacaoEdicaoEvento(perfil, evento, agora);

  return (
    <>
      {voltar}
      <PageHeader
        titulo={evento.titulo}
        descricao="Detalhes do evento."
        acoes={
          <div className={styles.acoes}>
            <EventoAcoes
              evento={evento}
              edicao={edicao}
              pequeno={false}
              podeExcluir={pode(PERMISSOES.EVENTOS_EXCLUIR)}
              onExcluir={() => setExcluindo(true)}
              estado={estado}
            />
          </div>
        }
      />
      {edicao.motivo && (
        <Alert tom="aviso" className={styles.aviso}>
          {edicao.motivo}
        </Alert>
      )}
      <EventoDetalhes evento={evento} encerrado={encerrado} />

      {excluindo && (
        <ExcluirEventoDialog
          evento={evento}
          onFechar={() => setExcluindo(false)}
          onExcluido={() => voltarComAviso(toast.sucesso, 'Evento excluído.')}
          onEventoRemovido={() => voltarComAviso(toast.aviso, 'Este evento não está mais na agenda.')}
        />
      )}
    </>
  );
}
