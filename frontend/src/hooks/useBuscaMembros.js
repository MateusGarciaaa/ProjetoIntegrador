import { useEffect, useState } from 'react';
import { TIPOS_ERRO } from '../services/http/apiError';
import { membrosService } from '../services/members/membrosService';
import { useDebouncedValue } from './useDebouncedValue';

export const ESPERA_BUSCA_MEMBROS_MS = 300;
export const MINIMO_LETRAS_BUSCA_MEMBROS = 2;

const VAZIO = { membros: [], total: 0, erro: null, carregando: false };

/**
 * Busca de membros pelo nome enquanto a pessoa digita, para o seletor do lançamento financeiro.
 * Usa GET /members/lookup (id, nome, status; A P S T): o Tesoureiro não tem acesso ao GET /members.
 * Só busca com ao menos 2 letras; uma resposta antiga nunca sobrescreve a atual.
 */
export function useBuscaMembros(termo) {
  const termoAtrasado = useDebouncedValue(termo.trim(), ESPERA_BUSCA_MEMBROS_MS);
  const [estado, setEstado] = useState(VAZIO);
  const buscar = termoAtrasado.length >= MINIMO_LETRAS_BUSCA_MEMBROS;

  useEffect(() => {
    if (!buscar) {
      setEstado(VAZIO);
      return undefined;
    }
    const controle = new AbortController();
    setEstado((anterior) => ({ ...anterior, erro: null, carregando: true }));

    membrosService
      .buscarResumo({ nome: termoAtrasado }, { signal: controle.signal })
      .then((pagina) => setEstado({ membros: pagina.content, total: pagina.totalElements, erro: null, carregando: false }))
      .catch((erro) => {
        if (erro.tipo === TIPOS_ERRO.CANCELADO) return;
        setEstado({ ...VAZIO, erro });
      });

    return () => controle.abort();
  }, [buscar, termoAtrasado]);

  const curtoDemais = termo.trim().length < MINIMO_LETRAS_BUSCA_MEMBROS;
  // Ainda esperando a pausa na digitação, ou a resposta.
  const aguardando = !curtoDemais && (termo.trim() !== termoAtrasado || estado.carregando);
  return { ...estado, aguardando, curtoDemais };
}
