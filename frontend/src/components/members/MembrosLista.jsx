import { Link, useLocation } from 'react-router-dom';
import { caminhoDoMembro, ROTAS } from '../../constants/rotas';
import { exibirTelefone } from '../../utils/telefone';
import { Table } from '../ui/Table';
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

function colunas(estado) {
  return [
    {
      chave: 'nome',
      rotulo: 'Nome',
      principal: true,
      ordenavel: true,
      renderizar: (membro) => (
        <Link to={caminhoDoMembro(membro.id)} state={estado} className={styles.nome}>
          {membro.nome}
        </Link>
      ),
    },
    { chave: 'email', rotulo: 'E-mail', ordenavel: true, className: styles.secundario, renderizar: (membro) => membro.email },
    { chave: 'telefone', rotulo: 'Telefone', ordenavel: true, renderizar: (membro) => <Telefone valor={membro.telefone} /> },
    {
      chave: 'status',
      rotulo: 'Status',
      destaque: true,
      ordenavel: true,
      renderizar: (membro) => <MembroStatusBadge status={membro.status} />,
    },
  ];
}

/**
 * Lista de membros. O nome leva aos detalhes; a coluna de ações só existe para perfis que
 * podem editar ou excluir. Os links levam a URL atual da lista para o "Voltar" dos detalhes.
 */
export function MembrosLista({ membros, ordenacao, onOrdenar, podeEditar, podeExcluir, onExcluir }) {
  const { search } = useLocation();
  const estado = { voltarPara: `${ROTAS.MEMBROS}${search}` };
  const temAcoes = podeEditar || podeExcluir;
  const acoes = (membro) => (
    <MembroAcoes membro={membro} podeEditar={podeEditar} podeExcluir={podeExcluir} onExcluir={onExcluir} estado={estado} />
  );

  return (
    <Table
      legenda="Membros cadastrados"
      colunas={colunas(estado)}
      itens={membros}
      ordenacao={ordenacao}
      onOrdenar={onOrdenar}
      acoes={temAcoes ? acoes : undefined}
    />
  );
}
