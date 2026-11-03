import { useEffect, useRef, useState } from 'react';
import { ATRASO_BUSCA_USUARIOS_MS, OPCOES_PERFIL, OPCOES_SITUACAO } from '../../constants/usuarios';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { SelectField } from '../ui/FormField';
import { SearchField } from '../ui/SearchField';
import styles from './UsuariosFiltros.module.css';

const TODOS = { valor: '', rotulo: 'Todos' };

/** Busca por nome (com espera após a digitação), perfil e situação. A busca efetiva vive na URL. */
export function UsuariosFiltros({ consulta, onBuscar, onFiltrarPerfil, onFiltrarSituacao }) {
  const [texto, setTexto] = useState(consulta.nome);
  const termo = useDebouncedValue(texto.trim(), ATRASO_BUSCA_USUARIOS_MS);
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
        id="busca-usuarios"
        rotulo="Buscar usuários por nome"
        placeholder="Buscar por nome"
        className={styles.busca}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
      />
      <SelectField
        id="filtro-perfil-usuarios"
        rotulo="Perfil"
        className={styles.selecao}
        opcoes={[TODOS, ...OPCOES_PERFIL]}
        value={consulta.perfil}
        onChange={(evento) => onFiltrarPerfil(evento.target.value)}
      />
      <SelectField
        id="filtro-situacao-usuarios"
        rotulo="Situação"
        className={styles.selecao}
        opcoes={[TODOS, ...OPCOES_SITUACAO]}
        value={consulta.situacao}
        onChange={(evento) => onFiltrarSituacao(evento.target.value)}
      />
    </div>
  );
}
