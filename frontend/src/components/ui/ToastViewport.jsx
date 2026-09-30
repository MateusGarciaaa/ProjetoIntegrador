import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../utils/classNames';
import { Icon } from './Icon';
import styles from './ToastViewport.module.css';

const DURACAO_MS = { sucesso: 4500, aviso: 7000, erro: 8000 };
const ICONES = { sucesso: 'sucesso', aviso: 'alerta', erro: 'alerta' };

function Toast({ toast, onDispensar }) {
  useEffect(() => {
    const timer = setTimeout(() => onDispensar(toast.id), DURACAO_MS[toast.tipo]);
    return () => clearTimeout(timer);
  }, [toast, onDispensar]);

  return (
    <li className={cx(styles.toast, styles[toast.tipo])} role={toast.tipo === 'erro' ? 'alert' : undefined}>
      <Icon nome={ICONES[toast.tipo]} tamanho={18} className={styles.icone} />
      <p className={styles.mensagem}>{toast.mensagem}</p>
      <button type="button" className={styles.fechar} onClick={() => onDispensar(toast.id)} aria-label="Fechar notificação">
        <Icon nome="fechar" tamanho={16} />
      </button>
    </li>
  );
}

/** Fica fora do #root para continuar visível e anunciável com uma modal aberta. */
export function ToastViewport({ toasts, onDispensar }) {
  return createPortal(
    <ol className={styles.regiao} aria-live="polite" aria-label="Notificações">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDispensar={onDispensar} />
      ))}
    </ol>,
    document.body,
  );
}
