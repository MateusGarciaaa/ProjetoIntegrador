import { useCallback, useEffect, useState } from 'react';
import { ORDENACAO_MEMBROS, TAMANHO_PAGINA_MEMBROS } from '../constants/membros';
import { TIPOS_ERRO } from '../services/http/apiError';
import { membrosService } from '../services/members/membrosService';

const ESTADO_INICIAL = { status: 'carregando', pagina: null, erro: null };

/**
 * Busca uma página de membros sempre que o filtro muda.
 * Requisições antigas são canceladas, então uma resposta lenta nunca sobrescreve a atual.
 */
export function useMembros({ nome, pagina }) {
  const [estado, setEstado] = useState(ESTADO_INICIAL);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    setEstado((anterior) => ({ ...anterior, status: 'carregando', erro: null }));

    membrosService
      .listar({ nome, pagina, tamanho: TAMANHO_PAGINA_MEMBROS, ordenacao: ORDENACAO_MEMBROS }, { signal: controle.signal })
      .then((resultado) => setEstado({ status: 'sucesso', pagina: resultado, erro: null }))
      .catch((erro) => {
        if (erro.tipo === TIPOS_ERRO.CANCELADO) return;
        setEstado({ status: 'erro', pagina: null, erro });
      });

    return () => controle.abort();
  }, [nome, pagina, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  return {
    pagina: estado.pagina,
    erro: estado.erro,
    carregando: estado.status === 'carregando',
    recarregar,
  };
}
