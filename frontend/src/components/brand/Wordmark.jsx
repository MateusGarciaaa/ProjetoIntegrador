import { cx } from '../../utils/classNames';
import styles from './Wordmark.module.css';

/** Selo (rosácea simplificada) + nome. */
export function Wordmark({ claro = false, className }) {
  return (
    <span className={cx(styles.marca, claro && styles.claro, className)}>
      <svg className={styles.selo} width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <rect width="32" height="32" rx="8" fill={claro ? 'rgba(255,255,255,0.12)' : 'var(--color-primary)'} />
        <g fill="none" stroke="var(--color-accent-light)" strokeWidth="1.6">
          <circle cx="16" cy="16" r="10" />
          <circle cx="16" cy="11" r="5" />
          <circle cx="16" cy="21" r="5" />
          <circle cx="11" cy="16" r="5" />
          <circle cx="21" cy="16" r="5" />
        </g>
      </svg>
      ChurchHub
    </span>
  );
}
