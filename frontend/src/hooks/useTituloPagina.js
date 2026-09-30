import { useEffect } from 'react';

/** Título da aba; leitores de tela o anunciam na troca de página. */
export function useTituloPagina(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} | ChurchHub` : 'ChurchHub';
  }, [titulo]);
}
