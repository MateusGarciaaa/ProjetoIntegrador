import { useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth/authService';
import { criarSessao, tempoRestanteMs, isSessaoExpirada } from '../services/auth/sessao';
import { contaService } from '../services/conta/contaService';
import {
  aoEncerrarSessao,
  encerrarSessao,
  lerSessao,
  limparSessao,
  MOTIVOS_FIM_SESSAO,
  salvarSessao,
} from '../services/auth/sessionStore';
import { MENSAGENS_ERRO } from '../services/http/apiError';
import { AuthContext } from './AuthContext';

/** Maior atraso aceito pelo setTimeout (~24,8 dias). */
const ATRASO_MAXIMO_TIMER = 2 ** 31 - 1;

const AVISOS = Object.freeze({
  [MOTIVOS_FIM_SESSAO.EXPIRADA]: MENSAGENS_ERRO.SESSAO_EXPIRADA,
  [MOTIVOS_FIM_SESSAO.RECUSADA]: MENSAGENS_ERRO.NAO_AUTENTICADO,
  [MOTIVOS_FIM_SESSAO.ACESSO_ALTERADO]: MENSAGENS_ERRO.ACESSO_ALTERADO,
  [MOTIVOS_FIM_SESSAO.SENHA_ALTERADA]: MENSAGENS_ERRO.SENHA_ALTERADA,
});

const textoOuNull = (valor) => (typeof valor === 'string' && valor.trim() ? valor.trim() : null);

/**
 * Nome e e-mail atuais (GET /me) por cima dos do token: se o Administrador mudou o nome da
 * pessoa, ela vê o novo sem entrar de novo. O perfil vem sempre do token (é ele que o backend confere).
 */
function usuarioExibido(sessao, conta) {
  if (!sessao) return null;
  if (!conta || conta.token !== sessao.token) return sessao.usuario;
  return { ...sessao.usuario, nome: conta.nome ?? sessao.usuario.nome, email: conta.email ?? sessao.usuario.email };
}

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(lerSessao);
  // { token, nome, email } do último GET /me; o token amarra os dados à sessão em que foram lidos.
  const [conta, setConta] = useState(null);
  const [avisoSessao, setAvisoSessao] = useState(null);
  // Saída pelo botão "Sair": o próximo login não deve voltar para a tela do usuário anterior.
  const [saidaVoluntaria, setSaidaVoluntaria] = useState(false);

  // Encerramentos vindos da camada HTTP (401 ou sessão recusada) e do timer abaixo.
  useEffect(
    () =>
      aoEncerrarSessao((motivo) => {
        setSessao(null);
        setSaidaVoluntaria(false);
        setAvisoSessao(AVISOS[motivo] ?? null);
      }),
    [],
  );

  // Ao abrir o app (ou trocar de token), relê nome e e-mail no servidor. Falha aqui não atrapalha:
  // o topo continua com os dados do token, e um 401 já encerra a sessão pelo httpClient.
  const token = sessao?.token ?? null;
  useEffect(() => {
    if (!token) return undefined;
    const controle = new AbortController();
    contaService
      .buscar({ signal: controle.signal })
      .then((dados) => setConta({ token, nome: textoOuNull(dados?.nome), email: textoOuNull(dados?.email) }))
      .catch(() => {});
    return () => controle.abort();
  }, [token]);

  // Logout automático no instante da expiração.
  useEffect(() => {
    if (!sessao) return undefined;
    const timer = setTimeout(
      () => encerrarSessao(MOTIVOS_FIM_SESSAO.EXPIRADA),
      Math.min(tempoRestanteMs(sessao), ATRASO_MAXIMO_TIMER),
    );
    return () => clearTimeout(timer);
  }, [sessao]);

  // Abas em segundo plano atrasam timers; ao voltar para a aba, confere de novo.
  useEffect(() => {
    if (!sessao) return undefined;
    const conferir = () => {
      if (document.visibilityState === 'visible' && isSessaoExpirada(sessao)) {
        encerrarSessao(MOTIVOS_FIM_SESSAO.EXPIRADA);
      }
    };
    document.addEventListener('visibilitychange', conferir);
    return () => document.removeEventListener('visibilitychange', conferir);
  }, [sessao]);

  const entrar = useCallback(async (credenciais) => {
    const novaSessao = await authService.entrar(credenciais);
    salvarSessao(novaSessao);
    setAvisoSessao(null);
    setSaidaVoluntaria(false);
    setSessao(novaSessao);
  }, []);

  /**
   * Troca o token da sessão atual pelo devolvido pelo backend (ex.: PUT /me/password, que derruba
   * os tokens anteriores). Resposta inválida encerra a sessão: o token antigo já não vale.
   */
  const renovarSessao = useCallback((respostaDeLogin) => {
    const novaSessao = criarSessao(respostaDeLogin);
    if (!novaSessao) {
      encerrarSessao(MOTIVOS_FIM_SESSAO.SENHA_ALTERADA);
      return;
    }
    salvarSessao(novaSessao);
    setSessao(novaSessao);
  }, []);

  const sair = useCallback(() => {
    limparSessao();
    setAvisoSessao(null);
    setSaidaVoluntaria(true);
    setSessao(null);
  }, []);

  const limparAvisoSessao = useCallback(() => setAvisoSessao(null), []);

  const valor = useMemo(
    () => ({
      autenticado: Boolean(sessao),
      usuario: usuarioExibido(sessao, conta),
      avisoSessao,
      saidaVoluntaria,
      entrar,
      sair,
      renovarSessao,
      limparAvisoSessao,
    }),
    [sessao, conta, avisoSessao, saidaVoluntaria, entrar, sair, renovarSessao, limparAvisoSessao],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
