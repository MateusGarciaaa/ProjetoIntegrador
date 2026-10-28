import { useLocation } from 'react-router-dom';
import { ROTAS } from '../constants/rotas';

/**
 * Endereço da lista de onde a pessoa veio (com busca, filtros, página ou visão), levado
 * no state dos links. Aberto direto (F5, link colado), volta para `listaPadrao` sem filtros.
 */
export function useVoltarParaLista(listaPadrao = ROTAS.MEMBROS) {
  const { state } = useLocation();
  const voltarPara = typeof state?.voltarPara === 'string' ? state.voltarPara : listaPadrao;
  return { voltarPara, estado: { voltarPara } };
}
