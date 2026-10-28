import { useMemo } from 'react';
import { DESEMPATE_MEMBROS, TAMANHO_PAGINA_MEMBROS } from '../constants/membros';
import { membrosService } from '../services/members/membrosService';
import { ordenacaoParaSort } from '../utils/ordenacao';
import { useConsultaPaginada } from './useConsultaPaginada';

function buscarMembros(consulta, opcoes) {
  return membrosService.listar(consulta, opcoes);
}

/** sort pedido + desempates que ainda não estão nele (ex.: status,desc → nome,asc → id,asc). */
function criteriosDeOrdenacao(campo, direcao) {
  const desempates = DESEMPATE_MEMBROS.filter((criterio) => !criterio.startsWith(`${campo},`));
  return [ordenacaoParaSort({ campo, direcao }), ...desempates];
}

/** Página de membros filtrada por nome e status, na ordenação escolhida. */
export function useMembros({ nome, status, pagina, campo, direcao }) {
  const consulta = useMemo(
    () => ({ nome, status, pagina, tamanho: TAMANHO_PAGINA_MEMBROS, ordenacao: criteriosDeOrdenacao(campo, direcao) }),
    [nome, status, pagina, campo, direcao],
  );
  return useConsultaPaginada(buscarMembros, consulta);
}
