import { useCallback, useRef, useState } from 'react';

/**
 * Impede envio duplo de formulário. O estado "enviando" só muda no próximo render, então
 * dois cliques no mesmo instante passariam por um `if (enviando)`; a ref bloqueia na hora.
 */
export function useEnvioUnico() {
  const emAndamento = useRef(false);
  const [enviando, setEnviando] = useState(false);

  const executar = useCallback(async (acao) => {
    if (emAndamento.current) return undefined;
    emAndamento.current = true;
    setEnviando(true);
    try {
      return await acao();
    } finally {
      emAndamento.current = false;
      setEnviando(false);
    }
  }, []);

  return { enviando, executar };
}
