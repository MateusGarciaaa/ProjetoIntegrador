import { faixaDaPagina } from '../../services/http/pagina';
import { Button } from './Button';
import styles from './Pagination.module.css';

export function Pagination({ pagina, onMudarPagina, desabilitado = false }) {
  const { inicio, fim, total } = faixaDaPagina(pagina);
  const totalPaginas = Math.max(pagina.totalPages, 1);
  const naPrimeira = pagina.number <= 0;
  const naUltima = pagina.number >= totalPaginas - 1;

  return (
    <nav className={styles.paginacao} aria-label="Paginação">
      <p className={styles.resumo} aria-live="polite">
        Mostrando {inicio}–{fim} de {total}
      </p>
      <div className={styles.controles}>
        <Button
          variante="secundario"
          pequeno
          icone="anterior"
          disabled={desabilitado || naPrimeira}
          onClick={() => onMudarPagina(pagina.number - 1)}
        >
          Anterior
        </Button>
        <span className={styles.pagina}>
          Página {pagina.number + 1} de {totalPaginas}
        </span>
        <Button
          variante="secundario"
          pequeno
          disabled={desabilitado || naUltima}
          onClick={() => onMudarPagina(pagina.number + 1)}
        >
          Próxima
        </Button>
      </div>
    </nav>
  );
}
