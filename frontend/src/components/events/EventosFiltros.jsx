import { useEffect, useState } from 'react';
import { validarPeriodo } from '../../schemas/consultaEventos';
import { limitesDoMes, mesDaData } from '../../utils/calendario';
import { formatarData, formatarDataDigitada } from '../../utils/datas';
import { Button } from '../ui/Button';
import { TextField } from '../ui/FormField';
import { SortSelect } from '../ui/SortSelect';
import styles from './EventosFiltros.module.css';

/** Rótulos da ordenação no modo cartões; as chaves são as de CAMPOS_ORDENAVEIS_EVENTOS. */
const CAMPOS_ORDENACAO = [
  { campo: 'data', rotulo: 'Data' },
  { campo: 'titulo', rotulo: 'Título' },
];

const TAMANHO_DATA = 10;

function textoDoPeriodo({ de, ate }) {
  return { de: formatarData(de), ate: formatarData(ate) };
}

/**
 * Filtro por período (De/Até, DD/MM/AAAA) aplicado com o botão, e — só em tela pequena — a
 * ordenação. O backend só filtra com as duas datas, então as duas são exigidas aqui.
 * O texto digitado é local; o período efetivo vive na URL.
 *   hoje: "AAAA-MM-DD" (atalho "Este mês").
 */
export function EventosFiltros({ consulta, hoje, onFiltrarPeriodo, onOrdenar }) {
  const [texto, setTexto] = useState(() => textoDoPeriodo(consulta));
  const [erros, setErros] = useState({});

  // A URL mudou por fora (voltar do navegador, "Limpar período"): os campos acompanham.
  useEffect(() => {
    setTexto(textoDoPeriodo({ de: consulta.de, ate: consulta.ate }));
    setErros({});
  }, [consulta.de, consulta.ate]);

  function alterar(campo, valor) {
    setTexto((atual) => ({ ...atual, [campo]: formatarDataDigitada(valor) }));
    setErros((atuais) => ({ ...atuais, [campo]: undefined }));
  }

  function aplicar(evento) {
    evento.preventDefault();
    const { periodo, erros: encontrados } = validarPeriodo(texto);
    setErros(encontrados);
    if (periodo) onFiltrarPeriodo(periodo);
  }

  function esteMes() {
    const { inicio, fim } = limitesDoMes(mesDaData(hoje));
    onFiltrarPeriodo({ de: inicio, ate: fim });
  }

  function limpar() {
    setTexto({ de: '', ate: '' });
    setErros({});
    onFiltrarPeriodo({ de: '', ate: '' });
  }

  return (
    <div className={styles.filtros}>
      <form className={styles.periodo} role="search" aria-label="Filtrar eventos por período" onSubmit={aplicar} noValidate>
        <TextField
          id="filtro-eventos-de"
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
          id="filtro-eventos-ate"
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
          <Button variante="fantasma" onClick={esteMes}>
            Este mês
          </Button>
          {(consulta.de || texto.de || texto.ate) && (
            <Button variante="fantasma" onClick={limpar}>
              Limpar
            </Button>
          )}
        </div>
      </form>
      <SortSelect
        id="ordenacao-eventos"
        className={styles.ordenacao}
        campos={CAMPOS_ORDENACAO}
        ordenacao={{ campo: consulta.campo, direcao: consulta.direcao }}
        onMudar={onOrdenar}
      />
    </div>
  );
}
