import { infoTipoMovimentacao, TIPOS_MOVIMENTACAO } from '../../constants/financeiro';
import { descreverPeriodo } from '../../schemas/consultaFinanceiro';
import { formatarData } from '../../utils/datas';
import { formatarPercentual, linhasPorCategoria } from '../../utils/fluxoDeCaixa';
import { centavosParaValor, formatarMoeda } from '../../utils/moeda';
import { ResumoFinanceiroCards } from './ResumoFinanceiroCards';
import { TipoMovimentacaoBadge } from './TipoMovimentacaoBadge';
import { ValorMovimentacao } from './ValorMovimentacao';
import styles from './RelatorioFinanceiro.module.css';

function reais(centavos) {
  return formatarMoeda(centavosParaValor(centavos));
}

function porData(a, b) {
  return a.data.localeCompare(b.data) || a.id.localeCompare(b.id);
}

function TabelaPorCategoria({ tipo, totaisPorCategoria, total }) {
  const { rotulo, plural } = infoTipoMovimentacao(tipo);
  const linhas = linhasPorCategoria(totaisPorCategoria, tipo, total);
  return (
    <section className={styles.secao} aria-labelledby={`relatorio-${tipo}`}>
      <h3 id={`relatorio-${tipo}`} className={styles.subtitulo}>
        {plural} por categoria
      </h3>
      {linhas.length === 0 ? (
        <p className={styles.vazio}>Nenhuma {rotulo.toLowerCase()} no período.</p>
      ) : (
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th scope="col">Categoria</th>
              <th scope="col">Lançamentos</th>
              <th scope="col">Total</th>
              <th scope="col">% do total</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.categoria.id}>
                <th scope="row">{linha.categoria.nome}</th>
                <td>{linha.quantidade}</td>
                <td>{reais(linha.total)}</td>
                <td>{formatarPercentual(linha.fracao)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>{linhas.reduce((soma, linha) => soma + linha.quantidade, 0)}</td>
              <td>{reais(total)}</td>
              <td>{formatarPercentual(1)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  );
}

/**
 * Relatório financeiro do período (RF15), pensado para a tela e para o papel: resumo (do /summary),
 * totais por categoria (do /summary/categories, somados no banco) e a lista dos lançamentos por data.
 * O backend não exporta arquivo: a "exportação" é a impressão do navegador (inclusive em PDF).
 *   totais: { receitas, despesas, saldo } em centavos; totaisPorCategoria: TotalPorCategoriaResponse[].
 */
export function RelatorioFinanceiro({ periodo, emitidoEm, totais, totaisPorCategoria, movimentacoes }) {
  const lancamentos = [...movimentacoes].sort(porData);
  return (
    <article className={styles.relatorio}>
      <header className={styles.cabecalho}>
        <h2 className={styles.titulo}>Relatório financeiro — {descreverPeriodo(periodo)}</h2>
        <p className={styles.meta}>
          Período de {formatarData(periodo.de)} a {formatarData(periodo.ate)} · Emitido em {formatarData(emitidoEm)}
        </p>
      </header>

      <ResumoFinanceiroCards totais={totais} titulo="Resumo do período" />

      <div className={styles.colunas}>
        <TabelaPorCategoria tipo={TIPOS_MOVIMENTACAO.RECEITA} totaisPorCategoria={totaisPorCategoria} total={totais.receitas} />
        <TabelaPorCategoria tipo={TIPOS_MOVIMENTACAO.DESPESA} totaisPorCategoria={totaisPorCategoria} total={totais.despesas} />
      </div>

      <section className={styles.secao} aria-labelledby="relatorio-lancamentos">
        <h3 id="relatorio-lancamentos" className={styles.subtitulo}>
          Lançamentos ({lancamentos.length})
        </h3>
        {lancamentos.length === 0 ? (
          <p className={styles.vazio}>Nenhuma movimentação no período.</p>
        ) : (
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Descrição</th>
                <th scope="col">Categoria</th>
                <th scope="col">Membro</th>
                <th scope="col">Tipo</th>
                <th scope="col">Valor</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((m) => (
                <tr key={m.id}>
                  <td>{formatarData(m.data)}</td>
                  <th scope="row">{m.descricao}</th>
                  <td>{m.categoria?.nome}</td>
                  <td>{m.membroNome ?? '—'}</td>
                  <td>
                    <TipoMovimentacaoBadge tipo={m.tipo} />
                  </td>
                  <td>
                    <ValorMovimentacao tipo={m.tipo} valor={m.valor} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </article>
  );
}
