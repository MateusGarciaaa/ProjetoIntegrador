import { cleanup, render } from '@testing-library/react';
import { afterEach } from 'vitest';
import { AuthContext } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastProvider';

// Sem "globals" no Vitest, a Testing Library não desmonta sozinha entre os testes.
afterEach(cleanup);

// O jsdom não implementa matchMedia (usado pelo AppLayout): simula uma tela de celular.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}

/**
 * Renderiza um componente com um usuário logado no perfil informado (ou deslogado, com null),
 * dentro do ToastProvider (como no App).
 * Só para arquivos *.test.jsx que declaram "// @vitest-environment jsdom".
 */
export function renderizarComPerfil(elemento, perfil) {
  const usuario = perfil ? { email: 'teste@churchhub.local', nome: null, perfil } : null;
  const auth = {
    autenticado: Boolean(usuario),
    usuario,
    avisoSessao: null,
    saidaVoluntaria: false,
    entrar: async () => {},
    sair: () => {},
    limparAvisoSessao: () => {},
  };
  return render(
    <ToastProvider>
      <AuthContext.Provider value={auth}>{elemento}</AuthContext.Provider>
    </ToastProvider>,
  );
}
