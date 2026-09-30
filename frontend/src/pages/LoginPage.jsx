import { LoginForm } from '../components/auth/LoginForm';
import { Alert } from '../components/ui/Alert';
import { appConfig } from '../config/env';
import { useAuth } from '../hooks/useAuth';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { CONTAS_DEMO, SENHA_DEMO } from '../services/mock/contasDemo';
import styles from './LoginPage.module.css';

const CONTAS_DO_MODO_SIMULADO = appConfig.useMockApi
  ? CONTAS_DEMO.map((conta) => ({ ...conta, senha: SENHA_DEMO }))
  : null;

export function LoginPage() {
  const { avisoSessao } = useAuth();
  useTituloPagina('Entrar');

  return (
    <>
      <h1 className={styles.titulo}>Entrar</h1>
      <p className={styles.descricao}>Use o e-mail e a senha cadastrados pela administração da igreja.</p>
      {avisoSessao && (
        <Alert tom="aviso" className={styles.aviso}>
          {avisoSessao}
        </Alert>
      )}
      <LoginForm contasDemo={CONTAS_DO_MODO_SIMULADO} />
    </>
  );
}
