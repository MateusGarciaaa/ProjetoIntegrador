import { useLocation } from 'react-router-dom';
import { ROTAS } from '../constants/rotas';

/**
 * Endereço da lista de membros de onde a pessoa veio (com busca, filtros e página), levado
 * no state dos links. Aberto direto (F5, link colado), volta para a lista sem filtros.
 */
export function useVoltarParaLista() {
  const { state } = useLocation();
  const voltarPara = typeof state?.voltarPara === 'string' ? state.voltarPara : ROTAS.MEMBROS;
  return { voltarPara, estado: { voltarPara } };
}
