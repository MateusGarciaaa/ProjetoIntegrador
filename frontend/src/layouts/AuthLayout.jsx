import styles from './AuthLayout.module.css';

export function AuthLayout({ children }) {
  return (
    <div className={styles.layout}>
      <aside className={styles.brandPanel}>
        <div className={styles.arch}>
          <span className={styles.wordmark}>ChurchHub</span>
          <p className={styles.tagline}>Membros, eventos e finanças da sua igreja em um só lugar.</p>
        </div>
      </aside>
      <main className={styles.formPanel}>
        <div className={styles.formContainer}>{children}</div>
      </main>
    </div>
  );
}
