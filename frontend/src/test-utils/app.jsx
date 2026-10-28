import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastProvider';
import { AppRoutes } from '../routes/AppRoutes';
import { salvarSessao } from '../services/auth/sessionStore';
import { CONTAS_DEMO, SENHA_DEMO } from '../services/mock/contasDemo';
import { criarServidorSimulado } from '../services/mock/servidorSimulado';
import './componentes';
import { tokenCom } from './tokens';
import { instalarTransporte, transporteDoServidor } from './transporte';

const FLAGS_ROUTER = { v7_startTransition: true, v7_relativeSplatPath: true };

/** Guarda a localização atual do MemoryRouter, para o teste conferir caminho, query e state. */
// Utilitário de teste, nunca recarregado pelo Fast Refresh.
// eslint-disable-next-line react-refresh/only-export-components
function Sonda({ localizacao }) {
  localizacao.atual = useLocation();
  return null;
}

/**
 * Abre o app inteiro (rotas, layout, permissões) já logado no perfil, a partir do caminho.
 * A sessão vai para o sessionStorage porque o interceptor do httpClient só envia com token;
 * o transporte deve ser trocado antes com instalarTransporte. Só para *.test.jsx em jsdom.
 * Com o servidor simulado, passe o token que ele emitiu no login ({ token }).
 * Devolve `localizacao.atual` ({ pathname, search, state }) sempre atualizada.
 */
export function abrirApp(caminho, perfil, { token } = {}) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const email = `${perfil.toLowerCase()}@churchhub.local`;
  salvarSessao({ token: token ?? tokenCom({ sub: email, perfil: `ROLE_${perfil}`, exp }), expiresAt: exp * 1000 });

  const auth = {
    autenticado: true,
    usuario: { email, nome: null, perfil },
    avisoSessao: null,
    saidaVoluntaria: false,
    entrar: async () => {},
    sair: () => {},
    limparAvisoSessao: () => {},
  };
  const localizacao = { atual: null };
  const resultado = render(
    <ToastProvider>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[caminho]} future={FLAGS_ROUTER}>
          <AppRoutes />
          <Sonda localizacao={localizacao} />
        </MemoryRouter>
      </AuthContext.Provider>
    </ToastProvider>,
  );
  return { ...resultado, localizacao };
}

/**
 * abrirApp com o servidor simulado respondendo (dados de demonstração, mesmas regras do backend).
 * Devolve também o transporte (chamadas feitas, restaurar()) e o atender (para preparar dados).
 */
export function abrirAppComServidor(caminho, perfil) {
  const atender = criarServidorSimulado({ validadeTokenSegundos: 3600 });
  const conta = CONTAS_DEMO.find((c) => c.perfil === perfil);
  const { data } = atender({ metodo: 'post', url: '/auth/login', corpo: { email: conta.email, password: SENHA_DEMO } });
  const transporte = instalarTransporte(transporteDoServidor(atender));
  return { ...abrirApp(caminho, perfil, { token: data.token }), transporte, atender };
}
