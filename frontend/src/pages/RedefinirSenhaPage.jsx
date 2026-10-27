import { useSearchParams } from 'react-router-dom';
import { RedefinirSenhaForm } from '../components/auth/RedefinirSenhaForm';
import { useTituloPagina } from '../hooks/useTituloPagina';
import styles from './PaginaAuth.module.css';

/** Aberta pelo link do e-mail: /reset-password?token=<UUID>. */
export function RedefinirSenhaPage() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token')?.trim() || null;
  useTituloPagina('Redefinir senha');

  return (
    <>
      <h1 className={styles.titulo}>Redefinir senha</h1>
      <p className={styles.descricao}>Escolha uma nova senha para acessar o ChurchHub.</p>
      {/* key: um novo link na mesma aba recomeça o formulário. */}
      <RedefinirSenhaForm key={token ?? ''} token={token} />
    </>
  );
}
