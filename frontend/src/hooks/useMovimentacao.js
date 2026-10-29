import { useCallback, useEffect, useState } from 'react';
import { TIPOS_ERRO } from '../services/http/apiError';
import { financeiroService } from '../services/financial/financeiroService';

/**
 * Carrega uma movimentação pelo id (GET /financial/{id}), sempre fresca: a edição nunca parte
 * de dados velhos da lista. naoEncontrado cobre 404 e id que não é UUID (400).
 */
export function useMovimentacao(id) {
  const [estado, setEstado] = useState({ movimentacao: null, erro: null, carregando: true });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    setEstado({ movimentacao: null, erro: null, carregando: true });

    financeiroService
      .buscarPorId(id, { signal: controle.signal })
      .then((movimentacao) => setEstado({ movimentacao, erro: null, carregando: false }))
      .catch((erro) => {
        if (erro.tipo === TIPOS_ERRO.CANCELADO) return;
        setEstado({ movimentacao: null, erro, carregando: false });
      });

    return () => controle.abort();
  }, [id, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const { erro } = estado;
  const naoEncontrado = erro?.tipo === TIPOS_ERRO.NAO_ENCONTRADO || erro?.status === 400;

  return { ...estado, naoEncontrado, recarregar };
}
