import { Alert } from '../ui/Alert';

const NUMERO = new Intl.NumberFormat('pt-BR');

/**
 * No lugar do gráfico ou das somas do relatório quando o período passou do limite de uma página do
 * Spring (size ≤ 2000): somar só o que chegou daria totais errados. A solução definitiva são
 * endpoints de agregação no backend (pendência registrada para o módulo Dashboard).
 *   o: "o gráfico" | "o relatório"; recebidos/total: content.length e totalElements.
 */
export function AvisoPeriodoGrande({ o, recebidos, total, className }) {
  return (
    <Alert tom="aviso" className={className}>
      <strong>O período tem mais lançamentos do que {o} consegue somar; reduza o período.</strong>{' '}
      Chegaram {NUMERO.format(recebidos)} de {NUMERO.format(total)} lançamentos, e somar só esses daria valores errados.
    </Alert>
  );
}
