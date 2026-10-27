import { useMemo } from 'react';
import { ORDENACAO_MEMBROS, TAMANHO_PAGINA_MEMBROS } from '../constants/membros';
import { membrosService } from '../services/members/membrosService';
import { useConsultaPaginada } from './useConsultaPaginada';

function buscarMembros(consulta, opcoes) {
  return membrosService.listar(consulta, opcoes);
}

/** Página de membros filtrada por nome, sempre ordenada por nome. */
export function useMembros({ nome, pagina }) {
  const consulta = useMemo(
    () => ({ nome, pagina, tamanho: TAMANHO_PAGINA_MEMBROS, ordenacao: ORDENACAO_MEMBROS }),
    [nome, pagina],
  );
  return useConsultaPaginada(buscarMembros, consulta);
}
