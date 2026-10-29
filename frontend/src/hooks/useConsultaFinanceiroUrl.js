import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { lerConsultaFinanceiro, parametrosDaConsultaFinanceiro } from '../schemas/consultaFinanceiro';

/**
 * Consulta das telas do Financeiro guardada na URL (ver schemas/consultaFinanceiro.js). Cada escolha
 * cria uma entrada no histórico; mudar período, tipo ou categoria volta para a 1ª página.
 *   hoje: "AAAA-MM-DD" no fuso do servidor (define o mês padrão).
 */
export function useConsultaFinanceiroUrl(hoje) {
  const [parametros, setParametros] = useSearchParams();
  const consulta = useMemo(() => lerConsultaFinanceiro(parametros, { hoje }), [parametros, hoje]);

  const atualizar = useCallback(
    (mudancas, { substituir = false } = {}) => {
      setParametros(
        (atuais) =>
          new URLSearchParams(parametrosDaConsultaFinanceiro({ ...lerConsultaFinanceiro(atuais, { hoje }), ...mudancas }, { hoje })),
        { replace: substituir },
      );
    },
    [setParametros, hoje],
  );

  const acoes = useMemo(
    () => ({
      filtrarPeriodo: ({ de, ate }) => atualizar({ de, ate, pagina: 0 }),
      /** Com categoria, troca as duas numa só entrada (ex.: a categoria escolhida não é do tipo novo). */
      filtrarTipo: (tipo, categoria) => atualizar({ tipo, ...(categoria !== undefined && { categoria }), pagina: 0 }),
      filtrarCategoria: (categoria) => atualizar({ categoria, pagina: 0 }),
      limparFiltros: () => atualizar({ tipo: '', categoria: '', pagina: 0 }),
      mudarPagina: (pagina) => atualizar({ pagina }),
      /** Página que ficou vazia (exclusão ou ?pagina= alto demais): troca sem nova entrada no histórico. */
      corrigirPagina: (pagina) => atualizar({ pagina }, { substituir: true }),
    }),
    [atualizar],
  );

  return { consulta, ...acoes };
}
