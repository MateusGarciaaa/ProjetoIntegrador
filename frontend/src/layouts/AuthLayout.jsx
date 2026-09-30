import { Outlet } from 'react-router-dom';
import { RoseWindow } from '../components/brand/RoseWindow';
import { Wordmark } from '../components/brand/Wordmark';
import styles from './AuthLayout.module.css';

/** Tela dividida para visitantes: identidade à esquerda, formulário à direita. */
export function AuthLayout() {
  return (
    <div className={styles.pagina}>
      <aside className={styles.marca}>
        <Wordmark claro />
        <div>
          <p className={styles.manifesto}>O cadastro da sua comunidade, cuidado com clareza.</p>
          <p className={styles.apoio}>Membros, visitantes e a rotina da secretaria da igreja reunidos em um só lugar.</p>
        </div>
        <RoseWindow className={styles.rosacea} />
      </aside>
      <main className={styles.conteudo}>
        <div className={styles.miolo}>
          <Wordmark className={styles.marcaCompacta} />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
