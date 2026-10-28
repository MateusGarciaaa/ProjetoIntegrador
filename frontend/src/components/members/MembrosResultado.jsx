import { infoStatus } from '../../constants/statusMembro';
import { temFiltro } from '../../schemas/consultaMembros';
import { cx } from '../../utils/classNames';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Pagination } from '../ui/Pagination';
import { MembrosLista } from './MembrosLista';
import { MembrosSkeleton } from './MembrosSkeleton';
import styles from './MembrosResultado.module.css';

function descreverFiltros({ nome, status }) {
  const partes = [];
  if (nome) partes.push(`com “${nome}” no nome`);
  if (status) partes.push(`com status ${infoStatus(status).rotulo}`);
  return `Nenhum membro ${partes.join(' e ')}. Confira a grafia ou mude os filtros.`;
}

/**
 * Conteúdo do painel da lista: erro, carregando, vazio (com ou sem filtro) ou a tabela paginada.
 *   lista: props repassadas à MembrosLista (ordenação, permissões e onExcluir).
 */
export function MembrosResultado({ pagina, erro, carregando, consulta, botaoNovo, onRecarregar, onLimpar, onMudarPagina, lista }) {
  if (erro) {
    return (
      <EmptyState
        icone="alerta"
        papel="alert"
        titulo="Não foi possível carregar os membros"
        descricao={erro.message}
        acao={
          <Button variante="secundario" onClick={onRecarregar}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (!pagina) return <MembrosSkeleton />;

  if (pagina.totalElements === 0 && temFiltro(consulta)) {
    return (
      <EmptyState
        icone="busca"
        titulo="Nenhum membro encontrado"
        descricao={descreverFiltros(consulta)}
        acao={
          <Button variante="secundario" onClick={onLimpar}>
            Limpar filtros
          </Button>
        }
      />
    );
  }

  if (pagina.totalElements === 0) {
    return (
      <EmptyState
        icone="membros"
        titulo="Nenhum membro cadastrado"
        descricao={
          botaoNovo
            ? 'Cadastre a primeira pessoa para começar a montar o rol de membros.'
            : 'Quando a secretaria cadastrar alguém, a pessoa aparece aqui.'
        }
        acao={botaoNovo}
      />
    );
  }

  return (
    <div aria-busy={carregando} className={cx(carregando && styles.atualizando)}>
      <MembrosLista membros={pagina.content} {...lista} />
      <Pagination pagina={pagina} onMudarPagina={onMudarPagina} desabilitado={carregando} />
    </div>
  );
}
