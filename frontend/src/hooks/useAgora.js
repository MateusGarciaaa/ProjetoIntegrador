import { useEffect, useState } from 'react';
import { agoraDoServidor } from '../schemas/regrasEvento';

const INTERVALO_MS = 60_000;

/**
 * "Agora" no fuso do servidor ({ data, horario }), renovado a cada minuto: um evento que
 * começa com a tela aberta passa a aparecer como encerrado sem precisar recarregar.
 */
export function useAgora() {
  const [agora, setAgora] = useState(() => agoraDoServidor());

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(agoraDoServidor()), INTERVALO_MS);
    return () => window.clearInterval(timer);
  }, []);

  return agora;
}
