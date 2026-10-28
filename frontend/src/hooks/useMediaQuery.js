import { useEffect, useState } from 'react';

function corresponde(consulta) {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(consulta).matches;
}

/** true enquanto a media query (ex.: "(min-width: 720px)") corresponder; acompanha o redimensionamento. */
export function useMediaQuery(consulta) {
  const [correspondeAgora, setCorresponde] = useState(() => corresponde(consulta));

  useEffect(() => {
    const lista = window.matchMedia(consulta);
    const aoMudar = (evento) => setCorresponde(evento.matches);
    setCorresponde(lista.matches);
    lista.addEventListener('change', aoMudar);
    return () => lista.removeEventListener('change', aoMudar);
  }, [consulta]);

  return correspondeAgora;
}
