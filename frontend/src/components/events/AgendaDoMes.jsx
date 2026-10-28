import { Link, useLocation } from 'react-router-dom';
import { caminhoDoEvento, ROTAS } from '../../constants/rotas';
import { isEventoEncerrado } from '../../schemas/regrasEvento';
import { limitesDoMes } from '../../utils/calendario';
import { cx } from '../../utils/classNames';
import { formatarDataPorExtenso, formatarHorario, formatarMesAno } from '../../utils/datas';
import { EventoSituacaoBadge } from './EventoSituacaoBadge';
import styles from './AgendaDoMes.module.css';

/**
 * Calendário no celular: só os dias do mês que têm eventos, um embaixo do outro.
 *   eventosPorData: { "AAAA-MM-DD": [evento] }; hoje: "AAAA-MM-DD"; agora: { data, horario }.
 */
export function AgendaDoMes({ mes, eventosPorData, hoje, agora }) {
  const { search } = useLocation();
  const estado = { voltarPara: `${ROTAS.EVENTOS}${search}` };
  const { inicio, fim } = limitesDoMes(mes);
  const dias = Object.keys(eventosPorData)
    .filter((data) => data >= inicio && data <= fim)
    .sort();

  if (dias.length === 0) {
    return <p className={styles.vazio}>Nenhum evento em {formatarMesAno(mes)}.</p>;
  }

  return (
    <ol className={styles.agenda} aria-label={`Agenda de ${formatarMesAno(mes)}`}>
      {dias.map((data) => (
        <li key={data} className={styles.dia} aria-current={data === hoje ? 'date' : undefined}>
          <h3 className={cx(styles.data, data === hoje && styles.hoje)}>
            {formatarDataPorExtenso(data)}
            {data === hoje && <span className={styles.marcaHoje}>Hoje</span>}
          </h3>
          <ul className={styles.eventos}>
            {eventosPorData[data].map((evento) => (
              <li key={evento.id}>
                <Link to={caminhoDoEvento(evento.id)} state={estado} className={styles.evento}>
                  <span className={styles.horario}>{formatarHorario(evento.horario)}</span>
                  <span className={styles.texto}>
                    <span className={styles.titulo}>{evento.titulo}</span>
                    {evento.local && <span className={styles.local}>{evento.local}</span>}
                  </span>
                  <EventoSituacaoBadge encerrado={isEventoEncerrado(evento, agora)} />
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
