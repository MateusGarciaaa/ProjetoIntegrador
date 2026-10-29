import { useMemo } from 'react';
import { AvisoPeriodoGrande } from '../components/financial/AvisoPeriodoGrande';
import { GraficoFluxoCaixa } from '../components/financial/GraficoFluxoCaixa';
import { MolduraFinanceiro } from '../components/financial/MolduraFinanceiro';
import { ResumoFinanceiroCards } from '../components/financial/ResumoFinanceiroCards';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useAgora } from '../hooks/useAgora';
import { useConsultaFinanceiroUrl } from '../hooks/useConsultaFinanceiroUrl';
import { useMovimentacoesDoPeriodo, useResumoFinanceiro } from '../hooks/useFinanceiro';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { agrupamentoDoPeriodo, serieDoFluxoDeCaixa, totaisDoResumo } from '../utils/fluxoDeCaixa';
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
 * Fluxo de caixa do período: totais oficiais do GET /financial/summary e o gráfico por dia (até ~2 meses)
 * ou por mês, calculado no cliente a partir das movimentações (o backend não tem série). Se o período
 * passar do limite de uma página (2000), o gráfico dá lugar a um aviso: somaria só parte dos lançamentos.
 */
export function FluxoCaixaPage() {
  useTituloPagina('Fluxo de caixa');
  const { data: hoje } = useAgora();
  const { consulta, filtrarPeriodo } = useConsultaFinanceiroUrl(hoje);
  const resumo = useResumoFinanceiro(consulta);
  const lista = useMovimentacoesDoPeriodo(consulta);
  const agrupamento = agrupamentoDoPeriodo(consulta.de, consulta.ate);
  const { movimentacoes } = lista;
  const serie = useMemo(
    () => (movimentacoes ? serieDoFluxoDeCaixa(movimentacoes, { de: consulta.de, ate: consulta.ate, agrupamento }) : null),
    [movimentacoes, consulta.de, consulta.ate, agrupamento],
  );

  return (
    <MolduraFinanceiro consulta={consulta} hoje={hoje} onFiltrarPeriodo={filtrarPeriodo}>
      <div className={styles.secao}>
        {resumo.erro ? (
          <ErroDeCarga titulo="Não foi possível carregar os totais" erro={resumo.erro} onTentar={resumo.recarregar} />
        ) : (
          <ResumoFinanceiroCards totais={totaisDoResumo(resumo.resumo)} />
        )}


        {lista.erro && <ErroDeCarga titulo="Não foi possível carregar o gráfico" erro={lista.erro} onTentar={lista.recarregar} />}
        {!lista.erro && !serie && (
          <div role="status">
            <span className="sr-only">Carregando o gráfico…</span>
            <Skeleton altura="16rem" />
          </div>
        )}
        {serie && lista.incompleto && <AvisoPeriodoGrande o="o gráfico" recebidos={lista.recebidos} total={lista.total} />}
        {serie && !lista.incompleto && <GraficoFluxoCaixa serie={serie} agrupamento={agrupamento} />}
      </div>
    </MolduraFinanceiro>
  );
}
