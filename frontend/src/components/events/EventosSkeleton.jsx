import { Skeleton } from '../ui/Skeleton';
import styles from './EventosSkeleton.module.css';

const LARGURAS = ['72%', '64%', '80%', '58%', '69%', '75%'];

/** Rótulo é anunciado pelo leitor de tela (ex.: "Carregando eventos…"). */
export function EventosSkeleton({ rotulo = 'Carregando eventos…' }) {
  return (
    <div className={styles.lista} role="status">
      <span className="sr-only">{rotulo}</span>
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
