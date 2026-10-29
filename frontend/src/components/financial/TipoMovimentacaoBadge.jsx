import { infoTipoMovimentacao } from '../../constants/financeiro';
import { cx } from '../../utils/classNames';
import { Icon } from '../ui/Icon';
import styles from './TipoMovimentacaoBadge.module.css';

/** Receita ou despesa com ícone (seta para cima/baixo), texto e cor: a cor nunca é a única pista. */
export function TipoMovimentacaoBadge({ tipo }) {
  const info = infoTipoMovimentacao(tipo);
  if (!info) return null;
  return (
    <span className={cx(styles.badge, styles[info.tom])}>
      <Icon nome={info.icone} tamanho={14} />
      {info.rotulo}
    </span>
  );
}
