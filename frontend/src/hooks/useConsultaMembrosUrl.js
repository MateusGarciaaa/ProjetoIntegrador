import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { lerConsultaMembros, parametrosDaConsulta } from '../schemas/consultaMembros';

/**
 * Consulta da lista de membros guardada na URL (ver schemas/consultaMembros.js).
 * Mudar filtro ou ordenação volta para a 1ª página. A digitação da busca substitui a
 * entrada do histórico (o "voltar" não refaz letra por letra); página, status e ordem
 * criam entradas novas, então o "voltar" do navegador desfaz cada escolha.
 */
export function useConsultaMembrosUrl() {
  const [parametros, setParametros] = useSearchParams();
  const consulta = useMemo(() => lerConsultaMembros(parametros), [parametros]);

  const atualizar = useCallback(
    (mudancas, { substituir = false } = {}) => {
      setParametros(
        (atuais) => new URLSearchParams(parametrosDaConsulta({ ...lerConsultaMembros(atuais), ...mudancas })),
        { replace: substituir },
      );
    },
    [setParametros],
  );

  const acoes = useMemo(
    () => ({
      buscar: (nome) => atualizar({ nome, pagina: 0 }, { substituir: true }),
      filtrarStatus: (status) => atualizar({ status, pagina: 0 }),
      ordenar: ({ campo, direcao }) => atualizar({ campo, direcao, pagina: 0 }),
      mudarPagina: (pagina) => atualizar({ pagina }),
      /** Página que deixou de existir (ex.: excluiu o último item dela): troca sem criar histórico. */
      corrigirPagina: (pagina) => atualizar({ pagina }, { substituir: true }),
      limpar: () => atualizar({ nome: '', status: '', pagina: 0 }),
    }),
    [atualizar],
  );

  return { consulta, ...acoes };
}
