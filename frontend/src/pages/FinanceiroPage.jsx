import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { EventosSkeleton } from '../components/events/EventosSkeleton';
import { ExcluirMovimentacaoDialog } from '../components/financial/ExcluirMovimentacaoDialog';
import { MolduraFinanceiro } from '../components/financial/MolduraFinanceiro';
import { MovimentacoesFiltros } from '../components/financial/MovimentacoesFiltros';
import { MovimentacoesLista } from '../components/financial/MovimentacoesLista';
import { Button, ButtonLink } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { infoTipoMovimentacao } from '../constants/financeiro';
import { PERMISSOES } from '../constants/permissoes';
import { ROTAS } from '../constants/rotas';
import { useAgora } from '../hooks/useAgora';
import { useCategorias } from '../hooks/useCategorias';
import { useConsultaFinanceiroUrl } from '../hooks/useConsultaFinanceiroUrl';
import { useMovimentacoes, useResumoFinanceiro } from '../hooks/useFinanceiro';
import { usePermissao } from '../hooks/usePermissao';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { useToast } from '../hooks/useToast';
import { descreverPeriodo, temFiltroDeLista } from '../schemas/consultaFinanceiro';
import { cx } from '../utils/classNames';
import { totaisDaLista } from '../utils/fluxoDeCaixa';
import { centavosParaValor, formatarMoeda } from '../utils/moeda';
import styles from './FinanceiroPage.module.css';

function reais(centavos) {
  return formatarMoeda(centavosParaValor(centavos));
}

/**
 * "12 movimentações · Receitas R$ … · Despesas R$ …": a quantidade é o totalElements do filtro; os
 * totais vêm do /summary do período (só o do tipo filtrado, e nenhum com filtro de categoria).
 */
function ResumoDaLista({ quantidade, totais }) {
  return (
    <p className={styles.resumo} aria-live="polite">
      <strong>
        {quantidade} {quantidade === 1 ? 'movimentação' : 'movimentações'}
      </strong>
      {totais.map(({ tipo, centavos }) => (
        <span key={tipo}>
          {infoTipoMovimentacao(tipo).plural}: {reais(centavos)}
        </span>
      ))}
    </p>
  );
}

function Resultado({ estado, consulta, botaoNovo, acoes, lista }) {
  const { pagina, erro, carregando, recarregar } = estado;
  if (erro) {
    return (
      <EmptyState
        icone="alerta"
        papel="alert"
        titulo="Não foi possível carregar as movimentações"
        descricao={erro.message}
        acao={
          <Button variante="secundario" onClick={recarregar}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (!pagina) return <EventosSkeleton rotulo="Carregando movimentações…" />;

  if (pagina.totalElements === 0 && temFiltroDeLista(consulta)) {
    return (
      <EmptyState
        icone="busca"
        titulo="Nenhuma movimentação com esses filtros"
        descricao={`Nada encontrado em ${descreverPeriodo(consulta)} com o tipo e a categoria escolhidos.`}
        acao={
          <Button variante="secundario" onClick={acoes.limparFiltros}>
            Limpar filtros
          </Button>
        }
      />
    );
  }

  if (pagina.totalElements === 0) {
    return (
      <EmptyState
        icone="financeiro"
        titulo="Nenhuma movimentação no período"
        descricao={botaoNovo ? `Nada lançado em ${descreverPeriodo(consulta)}. Registre a primeira receita ou despesa.` : `Nada lançado em ${descreverPeriodo(consulta)}.`}
        acao={botaoNovo}
      />
    );
  }

  return (
    <div aria-busy={carregando} className={cx(carregando && styles.atualizando)}>
      <MovimentacoesLista movimentacoes={pagina.content} {...lista} />
      <Pagination pagina={pagina} onMudarPagina={acoes.mudarPagina} desabilitado={carregando} />
    </div>
  );
}

/**
 * Movimentações do período (padrão: mês atual em São Paulo), filtradas por tipo e categoria e
 * paginadas no servidor. A cria/edita/exclui; T cria/edita (sem excluir); P só consulta.
 */
export function FinanceiroPage() {
  useTituloPagina('Financeiro');
  const toast = useToast();
  const { search } = useLocation();
  const { pode } = usePermissao();
  const { data: hoje } = useAgora();
  const { consulta, ...acoes } = useConsultaFinanceiroUrl(hoje);
  const estado = useMovimentacoes(consulta);
  const { resumo, recarregar: recarregarResumo } = useResumoFinanceiro(consulta);
  const { categorias } = useCategorias();
  const [aExcluir, setAExcluir] = useState(null);
  const { pagina, recarregar } = estado;
  const { corrigirPagina } = acoes;

  // Página que ficou vazia (último item excluído, ou ?pagina= alto demais na URL): vai para a última que existe.
  useEffect(() => {
    if (pagina && pagina.content.length === 0 && pagina.number > 0) {
      corrigirPagina(Math.max(0, pagina.totalPages - 1));
    }
  }, [pagina, corrigirPagina]);

  const fecharExclusao = useCallback(() => setAExcluir(null), []);
  function aposExclusao(notificar, mensagem) {
    notificar(mensagem);
    fecharExclusao();
    recarregar();
    recarregarResumo();
  }

  const botaoNovo = pode(PERMISSOES.FINANCEIRO_CRIAR) && (
    <ButtonLink icone="mais" to={ROTAS.FINANCEIRO_NOVO} state={{ voltarPara: `${ROTAS.FINANCEIRO}${search}` }}>
      Nova movimentação
    </ButtonLink>
  );

  return (
    <MolduraFinanceiro consulta={consulta} hoje={hoje} onFiltrarPeriodo={acoes.filtrarPeriodo} acoes={botaoNovo}>
      <MovimentacoesFiltros
        consulta={consulta}
        categorias={categorias}
        onFiltrarTipo={acoes.filtrarTipo}
        onFiltrarCategoria={acoes.filtrarCategoria}
        onLimpar={acoes.limparFiltros}
      />

      {pagina && pagina.totalElements > 0 && (
        <ResumoDaLista quantidade={pagina.totalElements} totais={totaisDaLista(resumo, consulta)} />
      )}

      <section className={styles.painel} aria-label="Lista de movimentações">
        <Resultado
          estado={estado}
          consulta={consulta}
          botaoNovo={botaoNovo}
          acoes={acoes}
          lista={{
            podeEditar: pode(PERMISSOES.FINANCEIRO_EDITAR),
            podeExcluir: pode(PERMISSOES.FINANCEIRO_EXCLUIR),
            onExcluir: setAExcluir,
          }}
        />
      </section>

      {aExcluir && (
        <ExcluirMovimentacaoDialog
          movimentacao={aExcluir}
          onFechar={fecharExclusao}
          onExcluida={() => aposExclusao(toast.sucesso, 'Movimentação excluída.')}
          onRemovida={() => aposExclusao(toast.aviso, 'Esta movimentação já não existia. A lista foi atualizada.')}
        />
      )}
    </MolduraFinanceiro>
  );
}
