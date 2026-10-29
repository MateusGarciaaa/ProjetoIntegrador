import { useLocation } from 'react-router-dom';
import { caminhoEdicaoMovimentacao, ROTAS } from '../../constants/rotas';
import { formatarData } from '../../utils/datas';
import { Button, ButtonLink } from '../ui/Button';
import { Table } from '../ui/Table';
import { TipoMovimentacaoBadge } from './TipoMovimentacaoBadge';
import { ValorMovimentacao } from './ValorMovimentacao';
import styles from './MovimentacoesLista.module.css';

function SemValor({ rotulo }) {
  return (
    <span className={styles.semValor}>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{rotulo}</span>
    </span>
  );
}

const COLUNAS = [
  { chave: 'descricao', rotulo: 'Descrição', principal: true, renderizar: (m) => m.descricao },
  { chave: 'data', rotulo: 'Data', renderizar: (m) => <span className={styles.numero}>{formatarData(m.data)}</span> },
  { chave: 'categoria', rotulo: 'Categoria', renderizar: (m) => m.categoria?.nome },
  {
    chave: 'membro',
    rotulo: 'Membro',
    className: styles.secundario,
    renderizar: (m) => m.membroNome || <SemValor rotulo="Sem membro vinculado" />,
  },
  { chave: 'tipo', rotulo: 'Tipo', destaque: true, renderizar: (m) => <TipoMovimentacaoBadge tipo={m.tipo} /> },
  { chave: 'valor', rotulo: 'Valor', className: styles.valor, renderizar: (m) => <ValorMovimentacao tipo={m.tipo} valor={m.valor} /> },
];

/**
 * Movimentações do período. Não há tela de detalhes (a linha já mostra tudo); a coluna de ações só
 * existe para quem edita (A, T) ou exclui (só A). O link de edição leva a URL atual para o "Voltar".
 */
export function MovimentacoesLista({ movimentacoes, podeEditar, podeExcluir, onExcluir }) {
  const { search } = useLocation();
  const estado = { voltarPara: `${ROTAS.FINANCEIRO}${search}` };

  function acoes(movimentacao) {
    const rotulo = `${movimentacao.descricao} de ${formatarData(movimentacao.data)}`;
    return (
      <>
        {podeEditar && (
          <ButtonLink
            variante="fantasma"
            pequeno
            icone="editar"
            aria-label={`Editar ${rotulo}`}
            to={caminhoEdicaoMovimentacao(movimentacao.id)}
            state={estado}
          >
            Editar
          </ButtonLink>
        )}
        {podeExcluir && (
          <Button variante="perigoSuave" pequeno icone="excluir" aria-label={`Excluir ${rotulo}`} onClick={() => onExcluir(movimentacao)}>
            Excluir
          </Button>
        )}
      </>
    );
  }

  return <Table legenda="Movimentações" colunas={COLUNAS} itens={movimentacoes} acoes={podeEditar || podeExcluir ? acoes : undefined} />;
}
