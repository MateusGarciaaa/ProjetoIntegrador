import { Link } from 'react-router-dom';
import { useCaixaEmailSimulada } from '../../hooks/useCaixaEmailSimulada';
import styles from './ContasDemonstracao.module.css';

/**
 * Só no modo simulado: mostra os links que o backend "enviaria" por e-mail. No backend real
 * (LoggingMailSender) o mesmo link aparece no log do Spring.
 */
export function CaixaEmailSimulada() {
  const emails = useCaixaEmailSimulada();

  return (
    <section className={styles.bloco} aria-labelledby="titulo-caixa-simulada">
      <h2 id="titulo-caixa-simulada" className={styles.titulo}>
        E-mails simulados
      </h2>
      <p className={styles.texto}>
        Modo demonstração: nenhum e-mail é enviado de verdade. Os links de redefinição gerados aparecem aqui.
      </p>
      {emails.length > 0 && (
        <ul className={styles.contas}>
          {emails.map(({ para, link }) => (
            <li key={link}>
              <Link className={styles.conta} to={link}>
                <span className={styles.perfil}>Redefinir senha</span>
                <span className={styles.email}>{para}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
