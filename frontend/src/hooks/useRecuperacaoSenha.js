import { useCallback, useState } from 'react';
import { isTokenInvalido, mapearErroRedefinicao } from '../schemas/senhaSchema';
import { authService } from '../services/auth/authService';
import { useEnvioUnico } from './useEnvioUnico';

/**
 * "Esqueci minha senha". Qualquer desfecho (200, 4xx, 5xx, rede, tempo esgotado) termina
 * no mesmo estado "enviado": a tela nunca revela se o e-mail tem cadastro.
 */
export function useEsqueciSenha() {
  const { enviando, executar } = useEnvioUnico();
  const [enviado, setEnviado] = useState(false);

  const solicitar = useCallback(
    (email) =>
      executar(async () => {
        try {
          await authService.solicitarRedefinicao({ email });
        } catch {
          // Ignorado de propósito (ver acima).
        }
        setEnviado(true);
      }),
    [executar],
  );

  return { enviando, enviado, solicitar };
}

export const ESTADOS_REDEFINICAO = Object.freeze({
  FORMULARIO: 'formulario',
  SUCESSO: 'sucesso',
  TOKEN_INVALIDO: 'token-invalido',
});

/**
 * "Redefinir senha" com o token do link. Sem token, já começa como inválido.
 * redefinir() devolve { camposErro, erroGeral } quando o erro é do formulário; null caso contrário.
 */
export function useRedefinirSenha(token) {
  const { enviando, executar } = useEnvioUnico();
  const [estado, setEstado] = useState(token ? ESTADOS_REDEFINICAO.FORMULARIO : ESTADOS_REDEFINICAO.TOKEN_INVALIDO);

  const redefinir = useCallback(
    (novaSenha) =>
      executar(async () => {
        try {
          await authService.redefinirSenha({ token, newPassword: novaSenha });
          setEstado(ESTADOS_REDEFINICAO.SUCESSO);
          return null;
        } catch (erro) {
          if (isTokenInvalido(erro)) {
            setEstado(ESTADOS_REDEFINICAO.TOKEN_INVALIDO);
            return null;
          }
          return mapearErroRedefinicao(erro);
        }
      }),
    [executar, token],
  );

  return { estado, enviando, redefinir };
}
