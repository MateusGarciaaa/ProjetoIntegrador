import { useMemo } from 'react';
import { AvisoPeriodoGrande } from '../components/financial/AvisoPeriodoGrande';
import { MolduraFinanceiro } from '../components/financial/MolduraFinanceiro';
import { RelatorioFinanceiro } from '../components/financial/RelatorioFinanceiro';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { CarregandoPagina } from '../components/ui/CarregandoPagina';
import { EmptyState } from '../components/ui/EmptyState';
import { useAgora } from '../hooks/useAgora';
import { useConsultaFinanceiroUrl } from '../hooks/useConsultaFinanceiroUrl';
import { useMovimentacoesDoPeriodo, useResumoFinanceiro } from '../hooks/useFinanceiro';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { descreverPeriodo } from '../schemas/consultaFinanceiro';
import { totaisConferem, totaisDasMovimentacoes, totaisDoResumo } from '../utils/fluxoDeCaixa';
import styles from './FinanceiroPage.module.css';

/**
 * Relatório financeiro mensal (RF15): por padrão o mês atual; qualquer período pode ser escolhido.
 * O backend não tem exportação (nem PDF nem planilha), então o botão usa a impressão do navegador,
 * que também salva em PDF; o CSS de impressão tira menu, abas, filtros e botões.
 * Período acima do limite de uma página (2000): nada de relatório nem impressão, só o aviso; as
 * somas por categoria sairiam erradas.
 */
export function RelatorioFinanceiroPage() {
  const { data: hoje } = useAgora();
  const { consulta, filtrarPeriodo } = useConsultaFinanceiroUrl(hoje);
  useTituloPagina(`Relatório financeiro — ${descreverPeriodo(consulta)}`);
  const resumo = useResumoFinanceiro(consulta);
  const lista = useMovimentacoesDoPeriodo(consulta);
  const { movimentacoes } = lista;
  const totais = totaisDoResumo(resumo.resumo);
  const totaisDaLista = useMemo(() => (movimentacoes ? totaisDasMovimentacoes(movimentacoes) : null), [movimentacoes]);
  const erro = resumo.erro ?? lista.erro;
  const carregado = Boolean(totais && totaisDaLista);
  const pronto = carregado && !lista.incompleto;

  function tentarDeNovo() {
    if (resumo.erro) resumo.recarregar();
    if (lista.erro) lista.recarregar();
  }

  const botaoImprimir = (
    <Button icone="imprimir" onClick={() => window.print()} disabled={!pronto}>
      Imprimir
    </Button>
  );

  function conteudo() {
    if (erro) {
      return (
        <EmptyState
          icone="alerta"
          papel="alert"
          titulo="Não foi possível montar o relatório"
          descricao={erro.message}
          acao={
            <Button variante="secundario" onClick={tentarDeNovo}>
              Tentar novamente
            </Button>
          }
        />
      );
    }
    if (!carregado) return <CarregandoPagina />;
    if (lista.incompleto) return <AvisoPeriodoGrande o="o relatório" recebidos={lista.recebidos} total={lista.total} />;
    return (
      <>
        {!totaisConferem(totaisDaLista, totais) && (
          <Alert tom="aviso" className={styles.aviso}>
            Os lançamentos mudaram enquanto o relatório carregava: o resumo e as tabelas podem não bater. Recarregue a página.
          </Alert>
        )}
        <RelatorioFinanceiro periodo={consulta} emitidoEm={hoje} totais={totais} totaisDaLista={totaisDaLista} movimentacoes={movimentacoes} />
      </>
    );
  }

  return (
    <MolduraFinanceiro consulta={consulta} hoje={hoje} onFiltrarPeriodo={filtrarPeriodo} acoes={botaoImprimir} imprimirCabecalho={false}>
      {conteudo()}
    </MolduraFinanceiro>
  );
}
