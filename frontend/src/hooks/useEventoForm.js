import { useCallback, useState } from 'react';
import { CAMPOS_EVENTO, formatarCampoEvento, montarPayloadEvento, validarEvento, valoresIniciaisEvento } from '../schemas/eventoSchema';

function semCampo(erros, campo) {
  const { [campo]: _removido, ...restantes } = erros;
  return restantes;
}

/**
 * Estado do formulário de evento (mesmo comportamento do de membro): valida ao sair do campo;
 * depois da primeira tentativa de envio, passa a validar também a cada digitação.
 */
export function useEventoForm(evento, { dataSugerida } = {}) {
  const [valores, setValores] = useState(() => valoresIniciaisEvento(evento, { dataSugerida }));
  const [erros, setErros] = useState({});
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const alterar = useCallback(
    (campo, valorDigitado) => {
      const proximos = { ...valores, [campo]: formatarCampoEvento(campo, valorDigitado) };
      setValores(proximos);
      setErros((atuais) => (tentouEnviar ? validarEvento(proximos) : semCampo(atuais, campo)));
    },
    [valores, tentouEnviar],
  );

  const sairDoCampo = useCallback(
    (campo) => {
      const mensagem = validarEvento(valores)[campo];
      setErros((atuais) => (mensagem ? { ...atuais, [campo]: mensagem } : semCampo(atuais, campo)));
    },
    [valores],
  );

  /** Valida tudo. Devolve o payload pronto, ou o primeiro campo inválido (na ordem da tela). */
  const prepararEnvio = useCallback(() => {
    setTentouEnviar(true);
    const encontrados = validarEvento(valores);
    setErros(encontrados);
    const primeiroInvalido = CAMPOS_EVENTO.find((campo) => encontrados[campo]) ?? null;
    return primeiroInvalido ? { payload: null, primeiroInvalido } : { payload: montarPayloadEvento(valores), primeiroInvalido };
  }, [valores]);

  const aplicarErrosDoServidor = useCallback((camposErro) => {
    setErros((atuais) => ({ ...atuais, ...camposErro }));
  }, []);

  return { valores, erros, alterar, sairDoCampo, prepararEnvio, aplicarErrosDoServidor };
}
