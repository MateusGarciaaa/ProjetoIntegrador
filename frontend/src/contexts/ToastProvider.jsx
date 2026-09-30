import { useCallback, useMemo, useState } from 'react';
import { ToastViewport } from '../components/ui/ToastViewport';
import { ToastContext } from './ToastContext';

let proximoId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dispensar = useCallback((id) => {
    setToasts((atuais) => atuais.filter((toast) => toast.id !== id));
  }, []);

  const notificar = useCallback((tipo, mensagem) => {
    proximoId += 1;
    const id = proximoId;
    setToasts((atuais) => [...atuais.slice(-3), { id, tipo, mensagem }]);
  }, []);

  const api = useMemo(
    () => ({
      sucesso: (mensagem) => notificar('sucesso', mensagem),
      erro: (mensagem) => notificar('erro', mensagem),
      aviso: (mensagem) => notificar('aviso', mensagem),
    }),
    [notificar],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDispensar={dispensar} />
    </ToastContext.Provider>
  );
}
