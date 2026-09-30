import { useEffect } from 'react';

const FOCAVEIS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function elementosFocaveis(container) {
  return Array.from(container.querySelectorAll(FOCAVEIS)).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

/**
 * Enquanto ativo: move o foco para dentro do container (priorizando [data-autofocus]),
 * mantém o Tab circulando dentro dele e, ao desativar, devolve o foco a quem o tinha.
 */
export function useFocusTrap(containerRef, ativo) {
  useEffect(() => {
    const container = containerRef.current;
    if (!ativo || !container) return undefined;

    const focoAnterior = document.activeElement;
    const inicial = container.querySelector('[data-autofocus]') ?? elementosFocaveis(container)[0] ?? container;
    inicial.focus();

    // Ouvinte no document: se o foco tiver escapado por qualquer motivo, o próximo Tab o traz de volta.
    function prenderTab(evento) {
      if (evento.key !== 'Tab') return;
      const focaveis = elementosFocaveis(container);
      if (focaveis.length === 0) {
        evento.preventDefault();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (!container.contains(document.activeElement)) {
        evento.preventDefault();
        (evento.shiftKey ? ultimo : primeiro).focus();
      } else if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', prenderTab);
    return () => {
      document.removeEventListener('keydown', prenderTab);
      if (focoAnterior instanceof HTMLElement && focoAnterior.isConnected) {
        focoAnterior.focus();
      } else {
        document.getElementById('conteudo-principal')?.focus();
      }
    };
  }, [containerRef, ativo]);
}
