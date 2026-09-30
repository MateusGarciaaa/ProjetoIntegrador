import { cx } from '../../utils/classNames';
import styles from './Badge.module.css';

/** tom: sucesso | aviso | info | neutro. A cor nunca é a única pista: o texto vem junto. */
export function Badge({ tom = 'neutro', children }) {
  return <span className={cx(styles.badge, styles[tom])}>{children}</span>;
}
