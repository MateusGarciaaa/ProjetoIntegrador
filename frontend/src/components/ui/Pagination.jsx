import { Button } from './Button';
import styles from './Pagination.module.css';

export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const isFirstPage = page === 0;
  const isLastPage = page >= totalPages - 1;

  return (
    <nav className={styles.pagination} aria-label="Paginação">
      <Button
        variant="secondary"
        icon="chevronLeft"
        iconOnly
        aria-label="Página anterior"
        disabled={isFirstPage}
        onClick={() => onPageChange(page - 1)}
      />
      <span className={styles.status}>
        Página {page + 1} de {totalPages}
      </span>
      <Button
        variant="secondary"
        icon="chevronRight"
        iconOnly
        aria-label="Próxima página"
        disabled={isLastPage}
        onClick={() => onPageChange(page + 1)}
      />
    </nav>
  );
}
