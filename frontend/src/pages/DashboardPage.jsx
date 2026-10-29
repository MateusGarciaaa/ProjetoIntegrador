import { useMemo } from 'react';
import { BlocoAniversariantes, BlocoMembros, BlocoNovosMembros, BlocoProximosEventos } from '../components/dashboard/BlocosDoDashboard';
import { BlocoDespesasPorCategoria, BlocoFinanceiroDoMes, BlocoReceitasDespesas } from '../components/dashboard/BlocosFinanceiros';
import { PageHeader } from '../components/ui/PageHeader';
import { PERMISSOES } from '../constants/permissoes';
import { useAgora } from '../hooks/useAgora';
import { useDashboard } from '../hooks/useDashboard';
import { usePermissao } from '../hooks/usePermissao';
import { useTituloPagina } from '../hooks/useTituloPagina';
import { periodoDosUltimosMeses, periodoPadrao } from '../schemas/consultaFinanceiro';
import styles from './DashboardPage.module.css';

/** Meses do gráfico de receitas × despesas, contando o atual. */
const MESES_NO_GRAFICO = 6;

/**
 * Bloco do GET /dashboard só aparece se o perfil pode vê-lo E o backend o mandou: enquanto carrega
 * (ou se falhou) vale a permissão; depois, um campo null quer dizer "não é para este perfil" e o
 * bloco some — nada de card vazio ou de "R$ 0,00" para quem não tem acesso (RN12).
 */
function deveMostrar(pode, permissao, dashboard, campo) {
  if (!pode(permissao)) return false;
  return !dashboard || dashboard[campo] != null;
}

/**
 * Painel inicial de todos os perfis (RN12: cada um vê só o que pode ver nos módulos de origem):
 * A e P veem tudo; S, membros (contagens, aniversariantes, novos membros) e eventos; T, financeiro e eventos; M, só eventos.
 * "Hoje" e "mês atual" são os do fuso da igreja. Cada bloco tem carregando e erro próprios.
 */
export function DashboardPage() {
  useTituloPagina('Painel');
  const { pode } = usePermissao();
  const { data: hoje } = useAgora();
  const consulta = useDashboard();
  const { dashboard } = consulta;
  const mes = useMemo(() => periodoPadrao(hoje), [hoje]);
  const ultimosMeses = useMemo(() => periodoDosUltimosMeses(hoje, MESES_NO_GRAFICO), [hoje]);

  const membros = deveMostrar(pode, PERMISSOES.DASHBOARD_MEMBROS, dashboard, 'totalMembros');
  const aniversariantes = deveMostrar(pode, PERMISSOES.DASHBOARD_MEMBROS, dashboard, 'aniversariantesDoMes');
  const novosMembros = deveMostrar(pode, PERMISSOES.DASHBOARD_MEMBROS, dashboard, 'novosMembros');
  const eventos = deveMostrar(pode, PERMISSOES.EVENTOS_VISUALIZAR, dashboard, 'proximosEventos');
  const financeiro = pode(PERMISSOES.DASHBOARD_FINANCEIRO);

  return (
    <>
      <PageHeader titulo="Painel" descricao="Resumo da igreja com o que o seu perfil pode acompanhar." />

      <div className={styles.grade}>
        {financeiro && <BlocoFinanceiroDoMes mes={mes} hoje={hoje} />}
        {membros && <BlocoMembros estado={consulta} dashboard={dashboard} />}
        {eventos && <BlocoProximosEventos estado={consulta} dashboard={dashboard} />}
        {aniversariantes && <BlocoAniversariantes estado={consulta} dashboard={dashboard} hoje={hoje} />}
        {novosMembros && <BlocoNovosMembros estado={consulta} dashboard={dashboard} />}
        {financeiro && <BlocoReceitasDespesas periodo={ultimosMeses} hoje={hoje} />}
        {financeiro && <BlocoDespesasPorCategoria mes={mes} hoje={hoje} />}
      </div>
    </>
  );
}
