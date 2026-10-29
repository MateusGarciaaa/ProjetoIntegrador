import { PageHeader } from '../ui/PageHeader';
import { AbasFinanceiro } from './AbasFinanceiro';
import { FiltroPeriodo } from './FiltroPeriodo';

/**
 * Topo comum das três telas do Financeiro: título, ações, abas e período (o mesmo nas três, via URL).
 *   imprimirCabecalho=false: o relatório tem cabeçalho próprio no papel, então este some na impressão.
 */
export function MolduraFinanceiro({ consulta, hoje, onFiltrarPeriodo, acoes, imprimirCabecalho = true, children }) {
  return (
    <>
      <div data-sem-impressao={imprimirCabecalho ? undefined : ''}>
        <PageHeader
          titulo="Financeiro"
          descricao="Receitas, despesas e relatórios da igreja."
          acoes={acoes && <div data-sem-impressao="">{acoes}</div>}
        />
        <AbasFinanceiro consulta={consulta} hoje={hoje} />
        <FiltroPeriodo periodo={consulta} hoje={hoje} onFiltrar={onFiltrarPeriodo} />
      </div>
      {children}
    </>
  );
}
