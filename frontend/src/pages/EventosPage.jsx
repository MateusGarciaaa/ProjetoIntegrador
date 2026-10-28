import { useCallback, useEffect, useState } from 'react';
import { AlternarVisao } from '../components/events/AlternarVisao';
import { CalendarioEventos } from '../components/events/CalendarioEventos';
import { EventosFiltros } from '../components/events/EventosFiltros';
import { EventosResultado } from '../components/events/EventosResultado';
import { ExcluirEventoDialog } from '../components/events/ExcluirEventoDialog';
import { ButtonLink } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { VISOES_EVENTOS } from '../constants/eventos';
import { PERMISSOES } from '../constants/permissoes';
import { ROTAS } from '../constants/rotas';
import { useAgora } from '../hooks/useAgora';
import { useConsultaEventosUrl } from '../hooks/useConsultaEventosUrl';
import { useEventos, useEventosDoMes } from '../hooks/useEventos';
import { usePermissao } from '../hooks/usePermissao';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { useToast } from '../hooks/useToast';
import { situacaoEdicaoEvento } from '../schemas/regrasEvento';
import { alternarOrdenacao } from '../utils/ordenacao';
import styles from './EventosPage.module.css';

/** Calendário do mês da URL. Só busca enquanto esta visão está aberta. */
function VisaoCalendario({ consulta, agora, podeCriar, acoes }) {
  const { eventos, erro, carregando, incompleto, recarregar } = useEventosDoMes(consulta.mes);
  return (
    <section className={styles.painel} aria-label="Calendário de eventos">
      <CalendarioEventos
        mes={consulta.mes}
        hoje={agora.data}
        agora={agora}
        eventos={eventos}
        erro={erro}
        carregando={carregando}
        incompleto={incompleto}
        podeCriar={podeCriar}
        onMudarMes={acoes.mudarMes}
        onHoje={acoes.irParaHoje}
        onRecarregar={recarregar}
        onVerDia={(data) => acoes.verMesNaLista({ de: data, ate: data })}
      />
    </section>
  );
}

/**
 * Lista paginada com período e ordenação da URL, e a exclusão (que só existe aqui).
 * Só busca enquanto esta visão está aberta.
 */
function VisaoLista({ consulta, agora, botaoNovo, acoes }) {
  const toast = useToast();
  const { perfil, pode } = usePermissao();
  const { pagina, erro, carregando, recarregar } = useEventos(consulta);
  const [eventoAExcluir, setEventoAExcluir] = useState(null);
  const { corrigirPagina } = acoes;
  const ordenacao = { campo: consulta.campo, direcao: consulta.direcao };

  // Página que ficou vazia (último item excluído, ou ?pagina= alto demais na URL): vai para a última que existe.
  useEffect(() => {
    if (pagina && pagina.content.length === 0 && pagina.number > 0) {
      corrigirPagina(Math.max(0, pagina.totalPages - 1));
    }
  }, [pagina, corrigirPagina]);

  const fecharExclusao = useCallback(() => setEventoAExcluir(null), []);

  function aposExclusao(notificar, mensagem) {
    notificar(mensagem);
    fecharExclusao();
    recarregar();
  }

  return (
    <>
      <div className={styles.barraFiltros}>
        <EventosFiltros consulta={consulta} hoje={agora.data} onFiltrarPeriodo={acoes.filtrarPeriodo} onOrdenar={acoes.ordenar} />
      </div>

      <section className={styles.painel} aria-label="Lista de eventos">
        <EventosResultado
          pagina={pagina}
          erro={erro}
          carregando={carregando}
          consulta={consulta}
          botaoNovo={botaoNovo}
          onRecarregar={recarregar}
          onLimpar={acoes.limparPeriodo}
          onMudarPagina={acoes.mudarPagina}
          lista={{
            agora,
            ordenacao,
            onOrdenar: (campo) => acoes.ordenar(alternarOrdenacao(ordenacao, campo)),
            podeEditar: pode(PERMISSOES.EVENTOS_EDITAR),
            edicaoDe: (evento) => situacaoEdicaoEvento(perfil, evento, agora),
            podeExcluir: pode(PERMISSOES.EVENTOS_EXCLUIR),
            onExcluir: setEventoAExcluir,
          }}
        />
      </section>

      {eventoAExcluir && (
        <ExcluirEventoDialog
          evento={eventoAExcluir}
          onFechar={fecharExclusao}
          onExcluido={() => aposExclusao(toast.sucesso, 'Evento excluído.')}
          onEventoRemovido={() => aposExclusao(toast.aviso, 'Este evento não está mais na agenda. A lista foi atualizada.')}
        />
      )}
    </>
  );
}

export function EventosPage() {
  useTituloPagina('Eventos');
  const { pode } = usePermissao();
  const agora = useAgora();
  const { consulta, ...acoes } = useConsultaEventosUrl(agora.data);
  const podeCriar = pode(PERMISSOES.EVENTOS_CRIAR);

  const botaoNovo = podeCriar && (
    <ButtonLink icone="mais" to={ROTAS.EVENTO_NOVO} className={styles.novo}>
      Novo evento
    </ButtonLink>
  );

  return (
    <>
      <PageHeader titulo="Eventos" descricao="Agenda de cultos, reuniões e atividades da igreja." />

      <div className={styles.barra}>
        <AlternarVisao visao={consulta.visao} onMudar={acoes.mudarVisao} />
        {botaoNovo}
      </div>

      {consulta.visao === VISOES_EVENTOS.LISTA ? (
        <VisaoLista consulta={consulta} agora={agora} botaoNovo={botaoNovo} acoes={acoes} />
      ) : (
        <VisaoCalendario consulta={consulta} agora={agora} podeCriar={podeCriar} acoes={acoes} />
      )}
    </>
  );
}
