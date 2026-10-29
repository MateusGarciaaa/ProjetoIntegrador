import { formatarPercentual } from '../../utils/fluxoDeCaixa';
import { centavosParaValor, formatarMoeda } from '../../utils/moeda';
import styles from './GraficoPorCategoria.module.css';

function reais(centavos) {
  return formatarMoeda(centavosParaValor(centavos));
}

/**
 * Barras horizontais de uma série só (total de cada categoria), da maior para a menor. Nome, valor e
 * percentual ficam escritos em cada linha com a tinta do texto, então a barra só reforça o que já
 * está legível (sem legenda, sem depender de cor) e cabe no celular sem eixo. É uma lista: o leitor
 * de tela lê "Categoria: valor (percentual)" em ordem.
 *   linhas: [{ categoria: { id, nome }, total (centavos), quantidade, fracao }] (utils/fluxoDeCaixa.linhasPorCategoria).
 */
export function GraficoPorCategoria({ linhas, rotulo }) {
  const maior = Math.max(...linhas.map((linha) => linha.total), 0);
  return (
    <ul className={styles.grafico} aria-label={rotulo}>
      {linhas.map((linha) => {
        const descricao = `${linha.categoria.nome}: ${reais(linha.total)} (${formatarPercentual(linha.fracao)}), ${linha.quantidade} ${linha.quantidade === 1 ? 'lançamento' : 'lançamentos'}`;
        return (
          <li key={linha.categoria.id} className={styles.linha} title={descricao}>
            <span className={styles.nome}>{linha.categoria.nome}</span>
            <span className={styles.valor}>
              {reais(linha.total)} <span className={styles.percentual}>({formatarPercentual(linha.fracao)})</span>
            </span>
            <span className={styles.trilho} aria-hidden="true">
              <span
                className={styles.barra}
                style={{
                  width: `${maior > 0 ? (linha.total / maior) * 100 : 0}%`,
                }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
