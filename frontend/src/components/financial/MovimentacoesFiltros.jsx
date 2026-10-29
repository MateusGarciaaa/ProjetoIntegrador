import { OPCOES_TIPO_MOVIMENTACAO } from '../../constants/financeiro';
import { temFiltroDeLista } from '../../schemas/consultaFinanceiro';
import { categoriasDoTipo } from '../../schemas/movimentacaoSchema';
import { Button } from '../ui/Button';
import { SelectField } from '../ui/FormField';
import styles from './MovimentacoesFiltros.module.css';

const OPCOES_TIPO = [{ valor: '', rotulo: 'Receitas e despesas' }, ...OPCOES_TIPO_MOVIMENTACAO.map(({ valor, plural }) => ({ valor, rotulo: plural }))];

/**
 * Filtros por tipo e categoria (enviados ao GET /financial, que filtra e pagina).
 * Com um tipo escolhido, só aparecem as categorias dele.
 */
export function MovimentacoesFiltros({ consulta, categorias, onFiltrarTipo, onFiltrarCategoria, onLimpar }) {
  const opcoesCategoria = [
    { valor: '', rotulo: 'Todas as categorias' },
    ...categoriasDoTipo(categorias, consulta.tipo).map((c) => ({ valor: c.id, rotulo: c.nome })),
  ];

  function filtrarTipo(tipo) {
    const categoria = (categorias ?? []).find((c) => c.id === consulta.categoria);
    onFiltrarTipo(tipo, tipo && categoria && categoria.tipo !== tipo ? '' : undefined);
  }

  return (
    <div className={styles.filtros}>
      <SelectField
        id="filtro-financeiro-tipo"
        rotulo="Tipo"
        className={styles.campo}
        opcoes={OPCOES_TIPO}
        value={consulta.tipo}
        onChange={(evento) => filtrarTipo(evento.target.value)}
      />
      <SelectField
        id="filtro-financeiro-categoria"
        rotulo="Categoria"
        className={styles.campo}
        opcoes={opcoesCategoria}
        value={consulta.categoria}
        disabled={!categorias}
        onChange={(evento) => onFiltrarCategoria(evento.target.value)}
      />
      {temFiltroDeLista(consulta) && (
        <div className={styles.botoes}>
          <Button variante="fantasma" onClick={onLimpar}>
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
