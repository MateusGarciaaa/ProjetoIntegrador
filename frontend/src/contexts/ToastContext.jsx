import { createContext, useCallback, useMemo, useRef, useState } from 'react';
import styles from './Toast.module.css';

const TOAST_DURATION_MS = 4000;

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (type, message) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current, { id, type, message }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <p key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
