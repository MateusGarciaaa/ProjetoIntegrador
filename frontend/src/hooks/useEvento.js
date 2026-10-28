import { useCallback, useEffect, useState } from 'react';
import { TIPOS_ERRO } from '../services/http/apiError';
import { eventosService } from '../services/events/eventosService';

/**
 * Carrega um evento pelo id (GET /events/{id}), sempre fresco: a edição e a regra de evento
 * encerrado nunca partem de dados velhos da lista. naoEncontrado cobre 404 e id que não é UUID (400).
 */
export function useEvento(id) {
  const [estado, setEstado] = useState({ evento: null, erro: null, carregando: true });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    setEstado({ evento: null, erro: null, carregando: true });

    eventosService
      .buscarPorId(id, { signal: controle.signal })
      .then((evento) => setEstado({ evento, erro: null, carregando: false }))
      .catch((erro) => {
        if (erro.tipo === TIPOS_ERRO.CANCELADO) return;
        setEstado({ evento: null, erro, carregando: false });
      });

    return () => controle.abort();
  }, [id, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const { erro } = estado;
  const naoEncontrado = erro?.tipo === TIPOS_ERRO.NAO_ENCONTRADO || erro?.status === 400;

  return { ...estado, naoEncontrado, recarregar };
}
