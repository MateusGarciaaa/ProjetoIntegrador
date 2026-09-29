import styles from './Spinner.module.css';

export function Spinner({ label }) {
  return (
    <span className={styles.wrapper}>
      <span className={styles.spinner} aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  );
}
