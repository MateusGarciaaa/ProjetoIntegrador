import { useMemo } from 'react';
import { TAMANHO_PAGINA_CALENDARIO, TAMANHO_PAGINA_EVENTOS } from '../constants/eventos';
import { criteriosOrdenacaoEventos } from '../schemas/consultaEventos';
import { eventosService } from '../services/events/eventosService';
import { intervaloDaGrade } from '../utils/calendario';
import { useConsultaPaginada } from './useConsultaPaginada';

function buscarEventos(consulta, opcoes) {
  return eventosService.listar(consulta, opcoes);
}

/** Página da lista de eventos: período opcional (de/ate), na ordenação escolhida. */
export function useEventos({ de, ate, pagina, campo, direcao }) {
  const consulta = useMemo(
    () => ({
      dataInicio: de,
      dataFim: ate,
      pagina,
      tamanho: TAMANHO_PAGINA_EVENTOS,
      ordenacao: criteriosOrdenacaoEventos({ campo, direcao }),
    }),
    [de, ate, pagina, campo, direcao],
  );
  return useConsultaPaginada(buscarEventos, consulta);
}

/**
 * Eventos das 6 semanas da grade de um mês ("AAAA-MM"), numa só página grande, em ordem
 * de data e horário. incompleto: havia mais eventos do que cabem numa página.
 */
export function useEventosDoMes(mes) {
  const consulta = useMemo(() => {
    const { inicio, fim } = intervaloDaGrade(mes);
    return {
      dataInicio: inicio,
      dataFim: fim,
      pagina: 0,
      tamanho: TAMANHO_PAGINA_CALENDARIO,
      ordenacao: criteriosOrdenacaoEventos({ campo: 'data', direcao: 'asc' }),
    };
  }, [mes]);
  const resultado = useConsultaPaginada(buscarEventos, consulta);
  const { pagina } = resultado;
  return {
    ...resultado,
    eventos: pagina?.content ?? null,
    incompleto: Boolean(pagina && pagina.totalElements > pagina.content.length),
  };
}
