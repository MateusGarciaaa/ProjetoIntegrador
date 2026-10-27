import { Spinner } from './Spinner';
import styles from './CarregandoPagina.module.css';

/** Fallback do Suspense enquanto o código de uma página é baixado. */
export function CarregandoPagina() {
  return (
    <div className={styles.carregando} role="status">
      <Spinner />
      <span>Carregando…</span>
    </div>
  );
}
