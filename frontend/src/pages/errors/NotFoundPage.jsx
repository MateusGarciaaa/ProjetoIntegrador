import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '../../routes/routePaths';
import styles from './ErrorPage.module.css';

export function NotFoundPage() {
  return (
    <section className={styles.container}>
      <h1 className={styles.title}>Página não encontrada</h1>
      <p className={styles.message}>O endereço acessado não existe ou foi alterado.</p>
      <Link to={ROUTE_PATHS.HOME} className={styles.link}>
        Ir para o início
      </Link>
    </section>
  );
}
