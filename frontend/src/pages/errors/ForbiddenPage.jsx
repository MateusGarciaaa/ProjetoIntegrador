import styles from './ErrorPage.module.css';

export function ForbiddenPage() {
  return (
    <section className={styles.container}>
      <h1 className={styles.title}>Acesso não permitido</h1>
      <p className={styles.message}>
        Seu perfil não tem permissão para ver esta página. Se precisar de acesso, fale com o administrador da igreja.
      </p>
    </section>
  );
}
