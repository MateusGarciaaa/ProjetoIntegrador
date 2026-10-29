import { MolduraFinanceiro } from '../components/financial/MolduraFinanceiro';
import { RelatorioFinanceiro } from '../components/financial/RelatorioFinanceiro';
import { Button } from '../components/ui/Button';
import { CarregandoPagina } from '../components/ui/CarregandoPagina';
import { EmptyState } from '../components/ui/EmptyState';
import { useAgora } from '../hooks/useAgora';
import { useConsultaFinanceiroUrl } from '../hooks/useConsultaFinanceiroUrl';
import { useMovimentacoesDoPeriodo, useResumoFinanceiro, useTotaisPorCategoria } from '../hooks/useFinanceiro';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { descreverPeriodo } from '../schemas/consultaFinanceiro';
import { totaisDoResumo } from '../utils/fluxoDeCaixa';

/**
 * Relatório financeiro mensal (RF15): por padrão o mês atual; qualquer período pode ser escolhido.
 * Totais e somas por categoria vêm do backend (somados no banco); a lista de lançamentos vem
 * inteira, página a página, então não há limite de período.
 * O backend não tem exportação (nem PDF nem planilha), então o botão usa a impressão do navegador,
 * que também salva em PDF; o CSS de impressão tira menu, abas, filtros e botões.
 */
export function RelatorioFinanceiroPage() {
  const { data: hoje } = useAgora();
  const { consulta, filtrarPeriodo } = useConsultaFinanceiroUrl(hoje);
  const { de, ate } = consulta;
  useTituloPagina(`Relatório financeiro — ${descreverPeriodo(consulta)}`);
  const resumo = useResumoFinanceiro({ de, ate });
  const porCategoria = useTotaisPorCategoria({ de, ate });
  const lista = useMovimentacoesDoPeriodo({ de, ate });
  const totais = totaisDoResumo(resumo.resumo);
  const consultas = [resumo, porCategoria, lista];
  const erro = consultas.find((c) => c.erro)?.erro;
  const pronto = Boolean(totais && porCategoria.linhas && lista.movimentacoes);

  function tentarDeNovo() {
    consultas.filter((c) => c.erro).forEach((c) => c.recarregar());
  }

  const botaoImprimir = (
    <Button icone="imprimir" onClick={() => window.print()} disabled={!pronto || Boolean(erro)}>
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
    if (!pronto) return <CarregandoPagina />;
    return (
      <RelatorioFinanceiro
        periodo={consulta}
        emitidoEm={hoje}
        totais={totais}
        totaisPorCategoria={porCategoria.linhas}
        movimentacoes={lista.movimentacoes}
      />
    );
  }

  return (
    <MolduraFinanceiro consulta={consulta} hoje={hoje} onFiltrarPeriodo={filtrarPeriodo} acoes={botaoImprimir} imprimirCabecalho={false}>
      {conteudo()}
    </MolduraFinanceiro>
  );
}
