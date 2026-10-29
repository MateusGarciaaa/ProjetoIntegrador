import { Link } from 'react-router-dom';
import { AGRUPAMENTOS, TIPOS_MOVIMENTACAO } from '../../constants/financeiro';
import { ROTAS } from '../../constants/rotas';
import { useResumoFinanceiro, useSerieFinanceira, useTotaisPorCategoria } from '../../hooks/useFinanceiro';
import { descreverPeriodo, parametrosDoPeriodo } from '../../schemas/consultaFinanceiro';
import { cx } from '../../utils/classNames';
import { linhasPorCategoria, serieDoFluxoDeCaixa, totaisDoResumo } from '../../utils/fluxoDeCaixa';
import { centavosParaValor, formatarMoeda, paraCentavos } from '../../utils/moeda';
import { GraficoFluxoCaixa } from '../financial/GraficoFluxoCaixa';
import { Icon } from '../ui/Icon';
import { BlocoDoPainel } from './BlocoDoPainel';
import { GraficoPorCategoria } from './GraficoPorCategoria';
import styles from './BlocosDoDashboard.module.css';

/*
 * Blocos do Financeiro no Painel (A, P e T). Cada um faz a própria consulta aos endpoints de
 * agregação (somados no banco) e carrega/falha sozinho, independente do GET /dashboard.
 */

/** Largura do viewBox do gráfico no cartão: rótulos legíveis também no celular. */
const LARGURA_GRAFICO = 420;

function caminhoComPeriodo(caminho, periodo, hoje, extras = {}) {
  const busca = new URLSearchParams({ ...parametrosDoPeriodo(periodo, { hoje }), ...extras }).toString();
  return busca ? `${caminho}?${busca}` : caminho;
}

/** Receitas, despesas e saldo do mês atual; cada número leva à lista (ou ao fluxo de caixa) do mês. */
export function BlocoFinanceiroDoMes({ mes, hoje }) {
  const resumo = useResumoFinanceiro(mes);

  function indicadores() {
    const totais = totaisDoResumo(resumo.resumo);
    const saldoNegativo = totais.saldo < 0;
    const itens = [
      {
        chave: 'receitas',
        rotulo: 'Receitas',
        icone: 'entrada',
        tom: styles.receita,
        para: caminhoComPeriodo(ROTAS.FINANCEIRO, mes, hoje, { tipo: TIPOS_MOVIMENTACAO.RECEITA }),
      },
      {
        chave: 'despesas',
        rotulo: 'Despesas',
        icone: 'saida',
        tom: styles.despesa,
        para: caminhoComPeriodo(ROTAS.FINANCEIRO, mes, hoje, { tipo: TIPOS_MOVIMENTACAO.DESPESA }),
      },
      {
        chave: 'saldo',
        rotulo: 'Saldo',
        icone: 'financeiro',
        tom: saldoNegativo ? styles.despesa : styles.saldo,
        para: caminhoComPeriodo(ROTAS.FLUXO_DE_CAIXA, mes, hoje),
        nota: saldoNegativo ? 'As despesas superaram as receitas.' : 'Receitas menos despesas.',
      },
    ];
    return (
      <div className={cx(styles.indicadores, styles.tres)}>
        {itens.map((item) => (
          <Link key={item.chave} className={styles.indicador} to={item.para}>
            <span className={cx(styles.indicadorRotulo, item.tom)}>
              <Icon nome={item.icone} tamanho={18} /> {item.rotulo}
            </span>
            <span className={styles.indicadorValor}>{formatarMoeda(centavosParaValor(totais[item.chave]))}</span>
            {item.nota && <span className={styles.nota}>{item.nota}</span>}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <BlocoDoPainel
      titulo={`Financeiro — ${descreverPeriodo(mes)}`}
      link={{ para: caminhoComPeriodo(ROTAS.FINANCEIRO, mes, hoje), rotulo: 'Ver movimentações' }}
      estado={resumo}
      pronto={Boolean(resumo.resumo)}
      alturaCarregando="5rem"
      largo
    >
      {indicadores}
    </BlocoDoPainel>
  );
}

/** Receitas × despesas por mês nos últimos meses (GET /financial/summary/series, agrupamento MES). */
export function BlocoReceitasDespesas({ periodo, hoje }) {
  const { de, ate } = periodo;
  const consulta = useSerieFinanceira({ de, ate, agrupamento: 'MES' });
  return (
    <BlocoDoPainel
      titulo="Receitas × despesas por mês"
      link={{ para: caminhoComPeriodo(ROTAS.FLUXO_DE_CAIXA, periodo, hoje), rotulo: 'Ver fluxo de caixa' }}
      estado={consulta}
      pronto={Boolean(consulta.pontos)}
      alturaCarregando="14rem"
    >
      {() => (
        <GraficoFluxoCaixa
          serie={serieDoFluxoDeCaixa(consulta.pontos, { de, ate, agrupamento: AGRUPAMENTOS.MES })}
          agrupamento={AGRUPAMENTOS.MES}
          titulo={descreverPeriodo(periodo)}
          largura={LARGURA_GRAFICO}
        />
      )}
    </BlocoDoPainel>
  );
}

/** Para onde foi o dinheiro no mês: despesas por categoria (GET /financial/summary/categories?tipo=DESPESA). */
export function BlocoDespesasPorCategoria({ mes, hoje }) {
  const consulta = useTotaisPorCategoria({ ...mes, tipo: TIPOS_MOVIMENTACAO.DESPESA });

  function grafico() {
    const { linhas } = consulta;
    if (linhas.length === 0) return <p className={styles.vazio}>Nenhuma despesa lançada em {descreverPeriodo(mes)}.</p>;
    // Total do tipo: a soma das categorias que o backend já agregou (poucas linhas, não lançamentos).
    const total = linhas.reduce((soma, linha) => soma + (paraCentavos(linha.total) ?? 0), 0);
    return (
      <GraficoPorCategoria
        linhas={linhasPorCategoria(linhas, TIPOS_MOVIMENTACAO.DESPESA, total)}
        rotulo={`Despesas por categoria em ${descreverPeriodo(mes)}`}
      />
    );
  }

  return (
    <BlocoDoPainel
      titulo="Despesas por categoria no mês"
      link={{ para: caminhoComPeriodo(ROTAS.RELATORIO_FINANCEIRO, mes, hoje), rotulo: 'Ver relatório' }}
      estado={consulta}
      pronto={Boolean(consulta.linhas)}
      alturaCarregando="10rem"
    >
      {grafico}
    </BlocoDoPainel>
  );
}
