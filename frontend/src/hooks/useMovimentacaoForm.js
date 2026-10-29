import { useCallback, useState } from 'react';
import {
  CAMPOS_MOVIMENTACAO,
  categoriaCompativel,
  formatarCampoMovimentacao,
  formatarValorAoSair,
  montarPayloadMovimentacao,
  validarMovimentacao,
  valoresIniciaisMovimentacao,
} from '../schemas/movimentacaoSchema';

function semCampo(erros, campo) {
  const { [campo]: _removido, ...restantes } = erros;
  return restantes;
}

/**
 * Estado do formulário de movimentação (mesmo comportamento dos de membro e evento): valida ao sair do
 * campo; depois da primeira tentativa de envio, valida também a cada digitação. Trocar o tipo limpa a
 * categoria que não serve para ele (o backend recusa receita com categoria de despesa).
 *   categorias: lista carregada (ou null enquanto carrega).
 */
export function useMovimentacaoForm(movimentacao, { hoje, categorias }) {
  const [valores, setValores] = useState(() => valoresIniciaisMovimentacao(movimentacao, { hoje }));
  const [erros, setErros] = useState({});
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const validar = useCallback((proximos) => validarMovimentacao(proximos, { categorias }), [categorias]);

  const alterar = useCallback(
    (campo, valorDigitado) => {
      const proximos = { ...valores, [campo]: formatarCampoMovimentacao(campo, valorDigitado) };
      if (campo === 'tipo' && proximos.categoriaId && categorias && !categoriaCompativel(categorias, proximos.categoriaId, proximos.tipo)) {
        proximos.categoriaId = '';
      }
      setValores(proximos);
      setErros((atuais) => {
        if (tentouEnviar) return validar(proximos);
        const restantes = semCampo(atuais, campo);
        return campo === 'tipo' ? semCampo(restantes, 'categoriaId') : restantes;
      });
    },
    [valores, tentouEnviar, categorias, validar],
  );

  /** Ao sair do campo de valor, ele ganha o formato completo ("1234,5" → "1.234,50"). */
  const sairDoCampo = useCallback(
    (campo) => {
      const proximos = campo === 'valor' ? { ...valores, valor: formatarValorAoSair(valores.valor) } : valores;
      if (proximos.valor !== valores.valor) setValores(proximos);
      const mensagem = validar(proximos)[campo];
      setErros((atuais) => (mensagem ? { ...atuais, [campo]: mensagem } : semCampo(atuais, campo)));
    },
    [valores, validar],
  );

  /** Valida tudo. Devolve o payload pronto, ou o primeiro campo inválido (na ordem da tela). */
  const prepararEnvio = useCallback(() => {
    setTentouEnviar(true);
    const encontrados = validar(valores);
    setErros(encontrados);
    const primeiroInvalido = CAMPOS_MOVIMENTACAO.find((campo) => encontrados[campo]) ?? null;
    return primeiroInvalido ? { payload: null, primeiroInvalido } : { payload: montarPayloadMovimentacao(valores), primeiroInvalido };
  }, [valores, validar]);

  const aplicarErrosDoServidor = useCallback((camposErro) => {
    setErros((atuais) => ({ ...atuais, ...camposErro }));
  }, []);

  /** Categoria recém-criada na modal: fica escolhida, e o tipo passa a ser o dela. */
  const escolherCategoria = useCallback((categoria) => {
    setValores((atuais) => ({ ...atuais, tipo: categoria.tipo, categoriaId: categoria.id }));
    setErros((atuais) => semCampo(semCampo(atuais, 'tipo'), 'categoriaId'));
  }, []);

  return { valores, erros, alterar, sairDoCampo, prepararEnvio, aplicarErrosDoServidor, escolherCategoria };
}
