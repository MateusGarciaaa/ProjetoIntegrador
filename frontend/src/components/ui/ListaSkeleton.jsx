import { Skeleton } from './Skeleton';
import styles from './ListaSkeleton.module.css';

const LARGURAS = ['72%', '64%', '80%', '58%', '69%', '75%'];

/**
 * Linhas "fantasma" de uma lista enquanto a primeira página carrega (membros, eventos,
 * movimentações, usuários). O rótulo é anunciado pelo leitor de tela (ex.: "Carregando membros…").
 */
export function ListaSkeleton({ rotulo }) {
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
