import { ROLE_LABELS } from '../../constants/roles';
import { MOCK_PASSWORD, MOCK_USERS } from '../../services/mock/authMock';
import styles from './DemoAccountsHint.module.css';

// Exibido apenas no modo simulado (VITE_USE_MOCK_API=true) para facilitar a apresentação.
export function DemoAccountsHint({ onSelect }) {
  return (
    <section className={styles.hint} aria-labelledby="demo-accounts-title">
      <h2 id="demo-accounts-title" className={styles.title}>
        Modo demonstração
      </h2>
      <p className={styles.description}>Escolha um perfil para preencher o acesso. Senha: {MOCK_PASSWORD}</p>
      <div className={styles.accounts}>
        {MOCK_USERS.map((user) => (
          <button
            key={user.email}
            type="button"
            className={styles.account}
            onClick={() => onSelect({ email: user.email, password: MOCK_PASSWORD })}
          >
            {ROLE_LABELS[user.role]}
          </button>
        ))}
      </div>
    </section>
  );
}
