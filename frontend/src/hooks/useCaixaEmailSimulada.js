import { useEffect, useState } from 'react';

/**
 * E-mails "enviados" pelo backend simulado. Usar só quando appConfig.useMockApi for true:
 * a caixa é carregada por import dinâmico e não entra no pacote do modo real.
 */
export function useCaixaEmailSimulada() {
  const [emails, setEmails] = useState([]);

  useEffect(() => {
    let ativo = true;
    let pararDeObservar = () => {};
    import('../services/mock/caixaDeSaida').then(({ listarEmails, observarEmails }) => {
      if (!ativo) return;
      setEmails(listarEmails());
      pararDeObservar = observarEmails(setEmails);
    });
    return () => {
      ativo = false;
      pararDeObservar();
    };
  }, []);

  return emails;
}
