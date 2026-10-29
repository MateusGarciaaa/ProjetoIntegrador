import { useEffect, useState } from 'react';
import { validarPeriodo } from '../../schemas/consultaEventos';
import { descreverPeriodo, periodoDoMesVizinho, periodoPadrao } from '../../schemas/consultaFinanceiro';
import { formatarData, formatarDataDigitada } from '../../utils/datas';
import { Button } from '../ui/Button';
import { TextField } from '../ui/FormField';
import styles from './FiltroPeriodo.module.css';

const TAMANHO_DATA = 10;

function textoDoPeriodo({ de, ate }) {
  return { de: formatarData(de), ate: formatarData(ate) };
}

/**
 * Período das telas do Financeiro (De/Até em DD/MM/AAAA, aplicado com o botão) e atalhos de mês.
 * O backend só filtra com as duas datas, então as duas são exigidas (mesma validação de Eventos).
 * Limpar volta ao mês atual. O texto digitado é local; o período efetivo vive na URL.
 *   hoje: "AAAA-MM-DD" no fuso da igreja.
 */
export function FiltroPeriodo({ periodo, hoje, onFiltrar, idPrefixo = 'financeiro' }) {
  const [texto, setTexto] = useState(() => textoDoPeriodo(periodo));
  const [erros, setErros] = useState({});

  // A URL mudou por fora (voltar do navegador, atalho de mês): os campos acompanham.
  useEffect(() => {
    setTexto(textoDoPeriodo({ de: periodo.de, ate: periodo.ate }));
    setErros({});
  }, [periodo.de, periodo.ate]);

  function alterar(campo, valor) {
    setTexto((atual) => ({ ...atual, [campo]: formatarDataDigitada(valor) }));
    setErros((atuais) => ({ ...atuais, [campo]: undefined }));
  }

  function aplicar(evento) {
    evento.preventDefault();
    const { periodo: novo, erros: encontrados } = validarPeriodo(texto);
    setErros(encontrados);
    if (novo) onFiltrar(novo.de ? novo : periodoPadrao(hoje));
  }

  return (
    <div className={styles.filtro}>
      <p className={styles.atual} aria-live="polite">
        Período: <strong>{descreverPeriodo(periodo)}</strong>
      </p>
      <form className={styles.campos} role="search" aria-label="Filtrar por período" onSubmit={aplicar} noValidate>
        <TextField
          id={`${idPrefixo}-de`}
          rotulo="De"
          className={styles.data}
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/AAAA"
          maxLength={TAMANHO_DATA}
          value={texto.de}
          erro={erros.de}
          onChange={(evento) => alterar('de', evento.target.value)}
        />
        <TextField
          id={`${idPrefixo}-ate`}
          rotulo="Até"
          className={styles.data}
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/AAAA"
          maxLength={TAMANHO_DATA}
          value={texto.ate}
          erro={erros.ate}
          onChange={(evento) => alterar('ate', evento.target.value)}
        />
        <div className={styles.botoes}>
          <Button type="submit" variante="secundario">
            Filtrar
          </Button>
          <Button variante="fantasma" icone="anterior" onClick={() => onFiltrar(periodoDoMesVizinho(periodo, -1))}>
            Mês anterior
          </Button>
          <Button variante="fantasma" onClick={() => onFiltrar(periodoPadrao(hoje))}>
            Este mês
          </Button>
          <Button variante="fantasma" onClick={() => onFiltrar(periodoDoMesVizinho(periodo, 1))}>
            Próximo mês
          </Button>
        </div>
      </form>
    </div>
  );
}
