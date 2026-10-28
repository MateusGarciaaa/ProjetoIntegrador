import { Link, useLocation } from 'react-router-dom';
import { caminhoDoEvento, ROTAS } from '../../constants/rotas';
import { isEventoEncerrado } from '../../schemas/regrasEvento';
import { formatarData, formatarHorario } from '../../utils/datas';
import { Table } from '../ui/Table';
import { EventoAcoes } from './EventoAcoes';
import { EventoSituacaoBadge } from './EventoSituacaoBadge';
import styles from './EventosLista.module.css';

function SemValor({ rotulo }) {
  return (
    <span className={styles.semValor}>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{rotulo}</span>
    </span>
  );
}

function colunas(estado, agora) {
  return [
    {
      chave: 'titulo',
      rotulo: 'Título',
      principal: true,
      ordenavel: true,
      renderizar: (evento) => (
        <Link to={caminhoDoEvento(evento.id)} state={estado} className={styles.titulo}>
          {evento.titulo}
        </Link>
      ),
    },
    {
      chave: 'data',
      rotulo: 'Data',
      ordenavel: true,
      renderizar: (evento) => <span className={styles.numero}>{formatarData(evento.data)}</span>,
    },
    { chave: 'horario', rotulo: 'Horário', renderizar: (evento) => <span className={styles.numero}>{formatarHorario(evento.horario)}</span> },
    {
      chave: 'local',
      rotulo: 'Local',
      className: styles.secundario,
      renderizar: (evento) => evento.local || <SemValor rotulo="Sem local" />,
    },
    {
      chave: 'situacao',
      rotulo: 'Situação',
      destaque: true,
      renderizar: (evento) => <EventoSituacaoBadge encerrado={isEventoEncerrado(evento, agora)} />,
    },
  ];
}

/**
 * Lista de eventos. O título leva aos detalhes; a coluna de ações só existe para perfis que
 * podem editar ou excluir. edicaoDe(evento) aplica a RN09 linha a linha. Os links levam a
 * URL atual (visão, período, página) para o "Voltar" dos detalhes.
 */
export function EventosLista({ eventos, agora, ordenacao, onOrdenar, podeEditar, edicaoDe, podeExcluir, onExcluir }) {
  const { search } = useLocation();
  const estado = { voltarPara: `${ROTAS.EVENTOS}${search}` };
  const temAcoes = podeEditar || podeExcluir;
  const acoes = (evento) => (
    <EventoAcoes evento={evento} edicao={edicaoDe(evento)} podeExcluir={podeExcluir} onExcluir={onExcluir} estado={estado} />
  );

  return (
    <Table
      legenda="Eventos"
      colunas={colunas(estado, agora)}
      itens={eventos}
      ordenacao={ordenacao}
      onOrdenar={onOrdenar}
      acoes={temAcoes ? acoes : undefined}
    />
  );
}
