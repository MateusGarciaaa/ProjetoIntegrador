import { Skeleton } from '../ui/Skeleton';
import styles from './MembrosSkeleton.module.css';

const LARGURAS = ['72%', '64%', '80%', '58%', '69%', '75%'];

export function MembrosSkeleton() {
  return (
    <div className={styles.lista} role="status">
      <span className="sr-only">Carregando membros…</span>
      {LARGURAS.map((largura) => (
        <div key={largura} className={styles.linha}>
          <Skeleton largura={largura} />
          <Skeleton largura="85%" />
          <Skeleton largura="60%" />
          <Skeleton largura="4.5rem" altura="1.25rem" />
        </div>
      ))}
    </div>
  );
}
