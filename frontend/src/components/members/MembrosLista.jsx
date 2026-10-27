import { Table } from '../ui/Table';
import { exibirTelefone } from '../../utils/telefone';
import { MembroAcoes } from './MembroAcoes';
import { MembroStatusBadge } from './MembroStatusBadge';
import styles from './MembrosLista.module.css';

function Telefone({ valor }) {
  const telefone = exibirTelefone(valor);
  return telefone ? (
    <span className={styles.telefone}>{telefone}</span>
  ) : (
    <span className={styles.semValor}>
      <span aria-hidden="true">—</span>
      <span className="sr-only">Sem telefone</span>
    </span>
  );
}

const COLUNAS = Object.freeze([
  { chave: 'nome', rotulo: 'Nome', principal: true, renderizar: (membro) => membro.nome },
  { chave: 'email', rotulo: 'E-mail', className: styles.secundario, renderizar: (membro) => membro.email },
  { chave: 'telefone', rotulo: 'Telefone', renderizar: (membro) => <Telefone valor={membro.telefone} /> },
  { chave: 'status', rotulo: 'Status', destaque: true, renderizar: (membro) => <MembroStatusBadge status={membro.status} /> },
]);

/** Lista de membros. A coluna de ações só existe para perfis que podem editar ou excluir. */
export function MembrosLista({ membros, podeEditar, podeExcluir, onEditar, onExcluir }) {
  const temAcoes = podeEditar || podeExcluir;
  const acoes = (membro) => (
    <MembroAcoes membro={membro} podeEditar={podeEditar} podeExcluir={podeExcluir} onEditar={onEditar} onExcluir={onExcluir} />
  );

  return <Table legenda="Membros cadastrados" colunas={COLUNAS} itens={membros} acoes={temAcoes ? acoes : undefined} />;
}
