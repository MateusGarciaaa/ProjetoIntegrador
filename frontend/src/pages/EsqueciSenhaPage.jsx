import { CaixaEmailSimulada } from '../components/auth/CaixaEmailSimulada';
import { EsqueciSenhaForm } from '../components/auth/EsqueciSenhaForm';
import { appConfig } from '../config/env';
import { useTituloPagina } from '../hooks/useTituloPagina';
import styles from './PaginaAuth.module.css';

export function EsqueciSenhaPage() {
  useTituloPagina('Esqueci minha senha');

  return (
    <>
      <h1 className={styles.titulo}>Esqueci minha senha</h1>
      <p className={styles.descricao}>Informe o e-mail de acesso. Enviaremos um link para você criar uma nova senha.</p>
      <EsqueciSenhaForm />
      {appConfig.useMockApi && <CaixaEmailSimulada />}
    </>
  );
}
