import { temPeriodo } from '../../schemas/consultaEventos';
import { cx } from '../../utils/classNames';
import { formatarData } from '../../utils/datas';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Pagination } from '../ui/Pagination';
import { EventosSkeleton } from './EventosSkeleton';
import { EventosLista } from './EventosLista';
import styles from './EventosResultado.module.css';

/**
 * Conteúdo do painel da lista: erro, carregando, vazio (com ou sem período) ou a tabela paginada.
 *   lista: props repassadas à EventosLista (ordenação, regra de edição, permissões e onExcluir).
 */
export function EventosResultado({ pagina, erro, carregando, consulta, botaoNovo, onRecarregar, onLimpar, onMudarPagina, lista }) {
  if (erro) {
    return (
      <EmptyState
        icone="alerta"
        papel="alert"
        titulo="Não foi possível carregar os eventos"
        descricao={erro.message}
        acao={
          <Button variante="secundario" onClick={onRecarregar}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (!pagina) return <EventosSkeleton />;

  if (pagina.totalElements === 0 && temPeriodo(consulta)) {
    return (
      <EmptyState
        icone="calendario"
        titulo="Nenhum evento no período"
        descricao={`Nada agendado entre ${formatarData(consulta.de)} e ${formatarData(consulta.ate)}.`}
        acao={
          <Button variante="secundario" onClick={onLimpar}>
            Limpar período
          </Button>
        }
      />
    );
  }

  if (pagina.totalElements === 0) {
    return (
      <EmptyState
        icone="calendario"
        titulo="Nenhum evento cadastrado"
        descricao={botaoNovo ? 'Cadastre o primeiro evento da agenda da igreja.' : 'Quando a secretaria cadastrar um evento, ele aparece aqui.'}
        acao={botaoNovo}
      />
    );
  }

  return (
    <div aria-busy={carregando} className={cx(carregando && styles.atualizando)}>
      <EventosLista eventos={pagina.content} {...lista} />
      <Pagination pagina={pagina} onMudarPagina={onMudarPagina} desabilitado={carregando} />
    </div>
  );
}
