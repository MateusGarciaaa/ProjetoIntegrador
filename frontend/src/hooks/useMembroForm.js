import { useCallback, useState } from 'react';
import { CAMPOS_MEMBRO, formatarCampoMembro, montarPayloadMembro, validarMembro, valoresIniciaisMembro } from '../schemas/membroSchema';

function semCampo(erros, campo) {
  const { [campo]: _removido, ...restantes } = erros;
  return restantes;
}

/**
 * Estado do formulário de membro. Valida ao sair do campo; depois da primeira
 * tentativa de envio, passa a validar também a cada digitação.
 */
export function useMembroForm(membro) {
  const [valores, setValores] = useState(() => valoresIniciaisMembro(membro));
  const [erros, setErros] = useState({});
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const alterar = useCallback(
    (campo, valorDigitado) => {
      const proximos = { ...valores, [campo]: formatarCampoMembro(campo, valorDigitado) };
      setValores(proximos);
      setErros((atuais) => (tentouEnviar ? validarMembro(proximos) : semCampo(atuais, campo)));
    },
    [valores, tentouEnviar],
  );

  const sairDoCampo = useCallback(
    (campo) => {
      const mensagem = validarMembro(valores)[campo];
      setErros((atuais) => (mensagem ? { ...atuais, [campo]: mensagem } : semCampo(atuais, campo)));
    },
    [valores],
  );

  /** Valida tudo. Devolve o payload pronto, ou o primeiro campo inválido (na ordem da tela). */
  const prepararEnvio = useCallback(() => {
    setTentouEnviar(true);
    const encontrados = validarMembro(valores);
    setErros(encontrados);
    const primeiroInvalido = CAMPOS_MEMBRO.find((campo) => encontrados[campo]) ?? null;
    return primeiroInvalido ? { payload: null, primeiroInvalido } : { payload: montarPayloadMembro(valores), primeiroInvalido };
  }, [valores]);

  const aplicarErrosDoServidor = useCallback((camposErro) => {
    setErros((atuais) => ({ ...atuais, ...camposErro }));
  }, []);

  return { valores, erros, alterar, sairDoCampo, prepararEnvio, aplicarErrosDoServidor };
}
