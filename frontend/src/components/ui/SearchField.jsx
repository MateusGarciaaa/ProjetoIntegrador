import { cx } from '../../utils/classNames';
import { Icon } from './Icon';
import styles from './SearchField.module.css';

export function SearchField({ id, rotulo, className, ...propsDoInput }) {
  return (
    <div className={cx(styles.busca, className)}>
      <label htmlFor={id} className="sr-only">
        {rotulo}
      </label>
      <Icon nome="busca" tamanho={18} className={styles.icone} />
      <input id={id} type="search" autoComplete="off" spellCheck="false" className={styles.entrada} {...propsDoInput} />
    </div>
  );
}
