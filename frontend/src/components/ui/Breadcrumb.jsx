import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import styles from './Breadcrumb.module.css';

/**
 * Trilha de navegação. `itens` = [{ rotulo, caminho? }]; o último é a página atual
 * e não vira link.
 */
export function Breadcrumb({ itens }) {
  if (!itens?.length) return null;
  const ultimo = itens.length - 1;

  return (
    <nav aria-label="Trilha de navegação" className={styles.trilha}>
      <ol className={styles.lista}>
        {itens.map((item, indice) => (
          <li key={`${item.rotulo}-${indice}`} className={styles.item}>
            {indice > 0 && <Icon nome="proxima" tamanho={14} className={styles.separador} />}
            {indice === ultimo || !item.caminho ? (
              <span aria-current={indice === ultimo ? 'page' : undefined}>{item.rotulo}</span>
            ) : (
              <Link to={item.caminho} className={styles.link}>
                {item.rotulo}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
