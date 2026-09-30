import { useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth/authService';
import { tempoRestanteMs, isSessaoExpirada } from '../services/auth/sessao';
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
});

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(lerSessao);
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
      usuario: sessao?.usuario ?? null,
      avisoSessao,
      saidaVoluntaria,
      entrar,
      sair,
      limparAvisoSessao,
    }),
    [sessao, avisoSessao, saidaVoluntaria, entrar, sair, limparAvisoSessao],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
