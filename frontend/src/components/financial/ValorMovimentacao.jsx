import { infoTipoMovimentacao } from '../../constants/financeiro';
import { cx } from '../../utils/classNames';
import { formatarMoeda } from '../../utils/moeda';
import styles from './ValorMovimentacao.module.css';

/**
 * Valor em BRL com o sinal escrito ("+ R$ 450,00" / "− R$ 486,32") além da cor. O valor do backend é
 * sempre positivo (RN06/RN07); o sinal vem do tipo. O leitor de tela ouve "receita" ou "despesa".
 */
export function ValorMovimentacao({ tipo, valor }) {
  const info = infoTipoMovimentacao(tipo);
  return (
    <span className={cx(styles.valor, info && styles[info.tom])}>
      {info && (
        <>
          <span aria-hidden="true">{info.sinal} </span>
          <span className="sr-only">{info.rotulo}: </span>
        </>
      )}
      {formatarMoeda(valor)}
    </span>
  );
}
