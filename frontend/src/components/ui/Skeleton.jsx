import styles from './Skeleton.module.css';

export function Skeleton({ largura = '100%', altura }) {
  return <span className={styles.skeleton} style={{ width: largura, height: altura }} aria-hidden="true" />;
}
