import { useEffect, useState } from 'react';

export function useDebouncedValue(valor, atrasoMs) {
  const [valorAtrasado, setValorAtrasado] = useState(valor);

  useEffect(() => {
    const timer = setTimeout(() => setValorAtrasado(valor), atrasoMs);
    return () => clearTimeout(timer);
  }, [valor, atrasoMs]);

  return valorAtrasado;
}
