import { Link, useLocation } from 'react-router-dom';
import { caminhoDoEvento, caminhoNovoEvento, ROTAS } from '../../constants/rotas';
import { isEventoEncerrado } from '../../schemas/regrasEvento';
import { gradeDoMes } from '../../utils/calendario';
import { cx } from '../../utils/classNames';
import { formatarData, formatarDataPorExtenso, formatarHorario } from '../../utils/datas';
import { Icon } from '../ui/Icon';
import styles from './CalendarioMensal.module.css';

const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const EVENTOS_POR_DIA = 3;

/**
 * Grade mensal (6 semanas, domingo a sábado). Cada dia lista os eventos em ordem de horário;
 * clicar num evento abre os detalhes. Com mais de EVENTOS_POR_DIA, "+N mais" abre a lista
 * filtrada naquele dia. Quem pode criar vê um "+" em cada dia para cadastrar já com a data.
 *   eventosPorData: { "AAAA-MM-DD": [evento] }; hoje: "AAAA-MM-DD"; agora: { data, horario }.
 */
export function CalendarioMensal({ mes, eventosPorData, hoje, agora, podeCriar, onVerDia }) {
  const { search } = useLocation();
  const estado = { voltarPara: `${ROTAS.EVENTOS}${search}` };

  return (
    <div className={styles.calendario}>
      <div className={styles.semana} aria-hidden="true">
        {DIAS_DA_SEMANA.map((dia) => (
          <span key={dia} className={styles.diaDaSemana}>
            {dia}
          </span>
        ))}
      </div>
      <ol className={styles.grade}>
        {gradeDoMes(mes).map(({ data, dia, doMes }) => {
          const eventos = eventosPorData[data] ?? [];
          const visiveis = eventos.slice(0, EVENTOS_POR_DIA);
          const restantes = eventos.length - visiveis.length;
          const ehHoje = data === hoje;
          return (
            <li
              key={data}
              className={cx(styles.dia, !doMes && styles.foraDoMes, ehHoje && styles.hoje)}
              aria-current={ehHoje ? 'date' : undefined}
              data-data={data}
            >
              <div className={styles.cabecalhoDia}>
                <span className={styles.numero} aria-hidden="true">
                  {dia}
                </span>
                <span className="sr-only">
                  {formatarDataPorExtenso(data)}
                  {eventos.length ? `, ${eventos.length} evento${eventos.length > 1 ? 's' : ''}` : ', sem eventos'}
                </span>
                {podeCriar && (
                  <Link
                    to={caminhoNovoEvento(data)}
                    state={estado}
                    className={styles.novo}
                    aria-label={`Novo evento em ${formatarData(data)}`}
                    title="Novo evento neste dia"
                  >
                    <Icon nome="mais" tamanho={14} />
                  </Link>
                )}
              </div>
              {visiveis.length > 0 && (
                <ul className={styles.eventos}>
                  {visiveis.map((evento) => (
                    <li key={evento.id}>
                      <Link
                        to={caminhoDoEvento(evento.id)}
                        state={estado}
                        className={cx(styles.evento, isEventoEncerrado(evento, agora) && styles.encerrado)}
                        title={`${formatarHorario(evento.horario)} · ${evento.titulo}${evento.local ? ` · ${evento.local}` : ''}`}
                      >
                        <span className={styles.horario}>{formatarHorario(evento.horario)}</span>
                        <span className={styles.titulo}>{evento.titulo}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {restantes > 0 && (
                <button type="button" className={styles.mais} onClick={() => onVerDia(data)}>
                  +{restantes} mais
                  <span className="sr-only"> em {formatarData(data)}</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
