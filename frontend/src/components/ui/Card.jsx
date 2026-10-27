import { cx } from '../../utils/classNames';
import styles from './Card.module.css';

/** Superfície com título opcional e ações no canto (ex.: blocos do dashboard). */
export function Card({ titulo, acoes, className, children }) {
  return (
    <section className={cx(styles.card, className)}>
      {(titulo || acoes) && (
        <header className={styles.cabecalho}>
          {titulo && <h2 className={styles.titulo}>{titulo}</h2>}
          {acoes}
        </header>
      )}
      <div className={styles.corpo}>{children}</div>
    </section>
  );
}
