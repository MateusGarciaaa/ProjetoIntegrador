import { useMemo } from 'react';
import { MEDIA_CALENDARIO_GRADE } from '../../constants/eventos';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { agruparPorData, mesDaData, somarMeses } from '../../utils/calendario';
import { cx } from '../../utils/classNames';
import { formatarMesAno } from '../../utils/datas';
import { Alert } from '../ui/Alert';
import { Button, IconButton } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { AgendaDoMes } from './AgendaDoMes';
import { CalendarioMensal } from './CalendarioMensal';
import { EventosSkeleton } from './EventosSkeleton';
import styles from './CalendarioEventos.module.css';

/**
 * Visão de calendário (RF10): navegação entre meses + grade mensal; em tela estreita, a
 * mesma consulta vira agenda (AgendaDoMes). Os eventos chegam já buscados (useEventosDoMes).
 */
export function CalendarioEventos({ mes, hoje, agora, eventos, erro, carregando, incompleto, podeCriar, onMudarMes, onHoje, onRecarregar, onVerDia }) {
  const emGrade = useMediaQuery(MEDIA_CALENDARIO_GRADE);
  const eventosPorData = useMemo(() => agruparPorData(eventos ?? []), [eventos]);
  const titulo = formatarMesAno(mes);

  function conteudo() {
    if (erro) {
      return (
        <EmptyState
          icone="alerta"
          papel="alert"
          titulo="Não foi possível carregar os eventos"
          descricao={erro.message}
          acao={
            <Button variante="secundario" onClick={onRecarregar}>
              Tentar novamente
            </Button>
          }
        />
      );
    }
    if (!eventos) return <EventosSkeleton rotulo={`Carregando eventos de ${titulo}…`} />;
    const props = { mes, eventosPorData, hoje, agora };
    return emGrade ? <CalendarioMensal {...props} podeCriar={podeCriar} onVerDia={onVerDia} /> : <AgendaDoMes {...props} />;
  }

  return (
    <div className={styles.calendario}>
      <div className={styles.navegacao}>
        <h2 className={styles.mes} aria-live="polite">
          {titulo}
        </h2>
        <div className={styles.botoes}>
          <IconButton icone="anterior" rotulo="Mês anterior" variante="secundario" onClick={() => onMudarMes(somarMeses(mes, -1))} />
          <Button variante="secundario" onClick={onHoje} disabled={mes === mesDaData(hoje)}>
            Hoje
          </Button>
          <IconButton icone="proxima" rotulo="Próximo mês" variante="secundario" onClick={() => onMudarMes(somarMeses(mes, 1))} />
        </div>
      </div>
      {incompleto && (
        <Alert tom="aviso" className={styles.aviso}>
          Há eventos demais neste período para mostrar todos no calendário. Use a lista para ver o restante.
        </Alert>
      )}
      <div aria-busy={carregando} className={cx(carregando && eventos && styles.atualizando)}>
        {conteudo()}
      </div>
    </div>
  );
}
