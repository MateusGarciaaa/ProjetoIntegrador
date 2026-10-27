import { useCallback, useEffect, useState } from 'react';
import { TIPOS_ERRO } from '../services/http/apiError';

const ESTADO_INICIAL = { status: 'carregando', pagina: null, erro: null };

/**
 * Busca uma página sempre que a consulta muda. `buscar(consulta, { signal })` vem de um
 * service e devolve a página já normalizada; a consulta deve ser estável (estado ou useMemo).
 * Requisições antigas são canceladas, então uma resposta lenta nunca sobrescreve a atual.
 */
export function useConsultaPaginada(buscar, consulta) {
  const [estado, setEstado] = useState(ESTADO_INICIAL);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    setEstado((anterior) => ({ ...anterior, status: 'carregando', erro: null }));

    buscar(consulta, { signal: controle.signal })
      .then((resultado) => setEstado({ status: 'sucesso', pagina: resultado, erro: null }))
      .catch((erro) => {
        if (erro.tipo === TIPOS_ERRO.CANCELADO) return;
        setEstado({ status: 'erro', pagina: null, erro });
      });

    return () => controle.abort();
  }, [buscar, consulta, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  return {
    pagina: estado.pagina,
    erro: estado.erro,
    carregando: estado.status === 'carregando',
    recarregar,
  };
}
