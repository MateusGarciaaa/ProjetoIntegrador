import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { VISOES_EVENTOS } from '../constants/eventos';
import { lerConsultaEventos, parametrosDaConsultaEventos } from '../schemas/consultaEventos';
import { mesDaData } from '../utils/calendario';

/**
 * Consulta da tela de eventos guardada na URL (ver schemas/consultaEventos.js). Cada escolha
 * (visão, mês, período, página, ordem) cria uma entrada no histórico, então o "voltar" do
 * navegador desfaz uma de cada vez. Mudar período ou ordenação volta para a 1ª página.
 *   hoje: "AAAA-MM-DD" no fuso do servidor (define o mês padrão do calendário).
 */
export function useConsultaEventosUrl(hoje) {
  const [parametros, setParametros] = useSearchParams();
  const consulta = useMemo(() => lerConsultaEventos(parametros, { hoje }), [parametros, hoje]);

  const atualizar = useCallback(
    (mudancas, { substituir = false } = {}) => {
      setParametros(
        (atuais) => new URLSearchParams(parametrosDaConsultaEventos({ ...lerConsultaEventos(atuais, { hoje }), ...mudancas }, { hoje })),
        { replace: substituir },
      );
    },
    [setParametros, hoje],
  );

  const acoes = useMemo(
    () => ({
      mudarVisao: (visao) => atualizar({ visao }),
      mudarMes: (mes) => atualizar({ mes }),
      irParaHoje: () => atualizar({ mes: mesDaData(hoje) }),
      filtrarPeriodo: ({ de, ate }) => atualizar({ de, ate, pagina: 0 }),
      ordenar: ({ campo, direcao }) => atualizar({ campo, direcao, pagina: 0 }),
      mudarPagina: (pagina) => atualizar({ pagina }),
      /** Página que deixou de existir (ex.: excluiu o último item dela): troca sem criar histórico. */
      corrigirPagina: (pagina) => atualizar({ pagina }, { substituir: true }),
      limparPeriodo: () => atualizar({ de: '', ate: '', pagina: 0 }),
      /** Período do mês exibido no calendário, já na lista. */
      verMesNaLista: ({ de, ate }) => atualizar({ visao: VISOES_EVENTOS.LISTA, de, ate, pagina: 0 }),
    }),
    [atualizar, hoje],
  );

  return { consulta, ...acoes };
}
