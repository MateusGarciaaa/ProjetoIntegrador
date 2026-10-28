import { formatarDataPorExtenso, formatarHorario } from '../../utils/datas';
import { Card } from '../ui/Card';
import { EventoSituacaoBadge } from './EventoSituacaoBadge';
import styles from './EventoDetalhes.module.css';

function Dado({ rotulo, children }) {
  return (
    <div className={styles.dado}>
      <dt className={styles.rotulo}>{rotulo}</dt>
      <dd className={styles.valor}>{children || <span className={styles.vazio}>Não informado</span>}</dd>
    </div>
  );
}

/** Todos os campos do EventoResponse, mais a situação (agendado/encerrado). */
export function EventoDetalhes({ evento, encerrado }) {
  return (
    <div className={styles.grupos}>
      <Card titulo="Quando e onde">
        <dl className={styles.lista}>
          <Dado rotulo="Data">{formatarDataPorExtenso(evento.data)}</Dado>
          <Dado rotulo="Horário">{formatarHorario(evento.horario)}</Dado>
          <Dado rotulo="Local">{evento.local}</Dado>
          <Dado rotulo="Situação">
            <EventoSituacaoBadge encerrado={encerrado} />
          </Dado>
        </dl>
      </Card>

      <Card titulo="Descrição">
        <p className={styles.descricao}>{evento.descricao || <span className={styles.vazio}>Sem descrição.</span>}</p>
      </Card>
    </div>
  );
}
