import { cx } from '../../utils/classNames';
import { Icon } from './Icon';
import styles from './Alert.module.css';

const ICONES = { erro: 'alerta', aviso: 'alerta', info: 'info' };

/** Erros usam role="alert" para serem anunciados assim que aparecem. */
export function Alert({ tom = 'erro', className, children }) {
  return (
    <div className={cx(styles.alerta, styles[tom], className)} role={tom === 'erro' ? 'alert' : 'status'}>
      <Icon nome={ICONES[tom]} tamanho={18} />
      <div className={styles.texto}>{children}</div>
    </div>
  );
}
