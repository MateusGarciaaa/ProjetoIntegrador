import { useMemo } from 'react';
import { GraficoFluxoCaixa } from '../components/financial/GraficoFluxoCaixa';
import { MolduraFinanceiro } from '../components/financial/MolduraFinanceiro';
import { ResumoFinanceiroCards } from '../components/financial/ResumoFinanceiroCards';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useAgora } from '../hooks/useAgora';
import { useConsultaFinanceiroUrl } from '../hooks/useConsultaFinanceiroUrl';
import { useResumoFinanceiro, useSerieFinanceira } from '../hooks/useFinanceiro';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { agrupamentoDaApi, agrupamentoDoPeriodo, serieDoFluxoDeCaixa, totaisDoResumo } from '../utils/fluxoDeCaixa';
import styles from './FinanceiroPage.module.css';

function ErroDeCarga({ titulo, erro, onTentar }) {
  return (
    <EmptyState
      icone="alerta"
      papel="alert"
      titulo={titulo}
      descricao={erro.message}
      acao={
        <Button variante="secundario" onClick={onTentar}>
          Tentar novamente
        </Button>
      }
    />
  );
}

/**
 * Fluxo de caixa do período: totais do GET /financial/summary e o gráfico por dia (até ~2 meses) ou
 * por mês, com a série do GET /financial/summary/series. Os dois são somados no banco, então
 * qualquer período cabe; cada um carrega e falha por conta própria.
 */
export function FluxoCaixaPage() {
  useTituloPagina('Fluxo de caixa');
  const { data: hoje } = useAgora();
  const { consulta, filtrarPeriodo } = useConsultaFinanceiroUrl(hoje);
  const { de, ate } = consulta;
  const agrupamento = agrupamentoDoPeriodo(de, ate);
  const resumo = useResumoFinanceiro({ de, ate });
  const serieDoServidor = useSerieFinanceira({ de, ate, agrupamento: agrupamentoDaApi(agrupamento) });
  const { pontos } = serieDoServidor;
  const serie = useMemo(() => (pontos ? serieDoFluxoDeCaixa(pontos, { de, ate, agrupamento }) : null), [pontos, de, ate, agrupamento]);

  return (
    <MolduraFinanceiro consulta={consulta} hoje={hoje} onFiltrarPeriodo={filtrarPeriodo}>
      <div className={styles.secao}>
        {resumo.erro ? (
          <ErroDeCarga titulo="Não foi possível carregar os totais" erro={resumo.erro} onTentar={resumo.recarregar} />
        ) : (
          <ResumoFinanceiroCards totais={totaisDoResumo(resumo.resumo)} />
        )}

        {serieDoServidor.erro && (
          <ErroDeCarga titulo="Não foi possível carregar o gráfico" erro={serieDoServidor.erro} onTentar={serieDoServidor.recarregar} />
        )}
        {!serieDoServidor.erro && !serie && (
          <div role="status">
            <span className="sr-only">Carregando o gráfico…</span>
            <Skeleton altura="16rem" />
          </div>
        )}
        {!serieDoServidor.erro && serie && <GraficoFluxoCaixa serie={serie} agrupamento={agrupamento} />}
      </div>
    </MolduraFinanceiro>
  );
}
