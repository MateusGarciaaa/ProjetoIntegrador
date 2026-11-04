import { afterAll, beforeAll } from 'vitest';

/**
 * O jsdom não calcula layout: offsetParent é sempre null e o useFocusTrap acharia que nenhum
 * controle está visível. Chamada no topo de um arquivo de teste, faz todo elemento ligado ao
 * documento contar como visível, como no navegador (e restaura o jsdom no fim do arquivo).
 */
export function simularElementosVisiveis() {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      configurable: true,
      get() {
        return this.isConnected ? this.parentNode : null;
      },
    });
  });
  afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', original);
  });
}
