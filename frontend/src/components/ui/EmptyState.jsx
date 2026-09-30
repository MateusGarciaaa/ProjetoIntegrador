import { Icon } from './Icon';
import styles from './EmptyState.module.css';

export function EmptyState({ icone = 'info', titulo, descricao, acao, papel }) {
  return (
    <div className={styles.vazio} role={papel}>
      <span className={styles.icone}>
        <Icon nome={icone} tamanho={22} />
      </span>
      <h2 className={styles.titulo}>{titulo}</h2>
      {descricao && <p className={styles.descricao}>{descricao}</p>}
      {acao && <div className={styles.acao}>{acao}</div>}
    </div>
  );
}
