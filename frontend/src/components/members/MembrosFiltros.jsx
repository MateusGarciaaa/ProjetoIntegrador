import { useEffect, useRef, useState } from 'react';
import { ATRASO_BUSCA_MS } from '../../constants/membros';
import { OPCOES_STATUS } from '../../constants/statusMembro';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { SelectField } from '../ui/FormField';
import { SearchField } from '../ui/SearchField';
import { SortSelect } from '../ui/SortSelect';
import styles from './MembrosFiltros.module.css';

const OPCOES_FILTRO_STATUS = [{ valor: '', rotulo: 'Todos' }, ...OPCOES_STATUS];

/** Rótulos da ordenação no modo cartões; as chaves são as de CAMPOS_ORDENAVEIS_MEMBROS. */
const CAMPOS_ORDENACAO = [
  { campo: 'nome', rotulo: 'Nome' },
  { campo: 'email', rotulo: 'E-mail' },
  { campo: 'telefone', rotulo: 'Telefone' },
  { campo: 'status', rotulo: 'Status' },
];

/**
 * Busca por nome (com espera de ATRASO_BUSCA_MS após a digitação), status e — só em
 * tela pequena — ordenação. O texto digitado é local; a busca efetiva vive na URL.
 */
export function MembrosFiltros({ consulta, onBuscar, onFiltrarStatus, onOrdenar }) {
  const [texto, setTexto] = useState(consulta.nome);
  const termo = useDebouncedValue(texto.trim(), ATRASO_BUSCA_MS);
  // Último nome combinado com a URL: evita reenviar o que veio dela e eco entre os dois efeitos.
  const ultimoNome = useRef(consulta.nome);

  useEffect(() => {
    if (termo === ultimoNome.current) return;
    ultimoNome.current = termo;
    onBuscar(termo);
  }, [termo, onBuscar]);

  // A URL mudou por fora (voltar do navegador, "Limpar filtros"): o campo acompanha.
  useEffect(() => {
    if (consulta.nome === ultimoNome.current) return;
    ultimoNome.current = consulta.nome;
    setTexto(consulta.nome);
  }, [consulta.nome]);

  return (
    <div className={styles.filtros} role="search">
      <SearchField
        id="busca-membros"
        rotulo="Buscar membros por nome"
        placeholder="Buscar por nome"
        className={styles.busca}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
      />
      <SelectField
        id="filtro-status-membros"
        rotulo="Status"
        className={styles.status}
        opcoes={OPCOES_FILTRO_STATUS}
        value={consulta.status}
        onChange={(evento) => onFiltrarStatus(evento.target.value)}
      />
      <SortSelect
        id="ordenacao-membros"
        className={styles.ordenacao}
        campos={CAMPOS_ORDENACAO}
        ordenacao={{ campo: consulta.campo, direcao: consulta.direcao }}
        onMudar={onOrdenar}
      />
    </div>
  );
}
