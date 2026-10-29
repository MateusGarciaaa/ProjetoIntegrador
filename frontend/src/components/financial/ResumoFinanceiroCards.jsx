import { cx } from '../../utils/classNames';
import { centavosParaValor, formatarMoeda } from '../../utils/moeda';
import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import styles from './ResumoFinanceiroCards.module.css';

/**
 * Receitas, despesas e saldo do período, em centavos (null enquanto carrega). Cada número tem
 * rótulo e ícone; o saldo diz em texto se é positivo ou negativo.
 */
export function ResumoFinanceiroCards({ totais, titulo = 'Totais do período' }) {
  const saldoNegativo = totais && totais.saldo < 0;
  const itens = [
    { chave: 'receitas', rotulo: 'Receitas', icone: 'entrada', tom: styles.receita },
    { chave: 'despesas', rotulo: 'Despesas', icone: 'saida', tom: styles.despesa },
    {
      chave: 'saldo',
      rotulo: 'Saldo',
      icone: 'financeiro',
      tom: saldoNegativo ? styles.despesa : styles.saldo,
      nota: totais && (saldoNegativo ? 'As despesas superaram as receitas.' : 'Receitas menos despesas.'),
    },
  ];

  return (
    <section className={styles.cartoes} aria-label={titulo} aria-busy={!totais}>
      {itens.map((item) => (
        <div key={item.chave} className={styles.cartao}>
          <p className={cx(styles.rotulo, item.tom)}>
            <Icon nome={item.icone} tamanho={18} />
            {item.rotulo}
          </p>
          {totais ? (
            <p className={styles.valor}>{formatarMoeda(centavosParaValor(totais[item.chave]))}</p>
          ) : (
            <Skeleton largura="8rem" altura="1.75rem" />
          )}
          {item.nota && <p className={styles.nota}>{item.nota}</p>}
        </div>
      ))}
    </section>
  );
}
