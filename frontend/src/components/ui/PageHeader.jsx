import styles from './PageHeader.module.css';

export function PageHeader({ titulo, descricao, acoes }) {
  return (
    <div className={styles.cabecalho}>
      <div>
        <h1 className={styles.titulo}>{titulo}</h1>
        {descricao && <p className={styles.descricao}>{descricao}</p>}
      </div>
      {acoes}
    </div>
  );
}
