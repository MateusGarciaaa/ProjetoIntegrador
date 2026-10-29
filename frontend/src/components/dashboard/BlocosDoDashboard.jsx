import { Link } from 'react-router-dom';
import { DIAS_NOVOS_MEMBROS } from '../../constants/dashboard';
import { PERMISSOES } from '../../constants/permissoes';
import { caminhoDoEvento, caminhoDoMembro, caminhoNovoEvento, ROTAS } from '../../constants/rotas';
import { STATUS_MEMBRO } from '../../constants/statusMembro';
import { usePermissao } from '../../hooks/usePermissao';
import { formatarData, formatarDataHora, formatarDataPorExtenso, formatarHorario } from '../../utils/datas';
import { MembroStatusBadge } from '../members/MembroStatusBadge';
import { Icon } from '../ui/Icon';
import { BlocoDoPainel } from './BlocoDoPainel';
import styles from './BlocosDoDashboard.module.css';

const NUMERO = new Intl.NumberFormat('pt-BR');
const PERCENTUAL = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

/*
 * Os três blocos que vêm do GET /dashboard. Cada um recebe o mesmo estado da consulta, mas
 * mostra o próprio carregando/erro (e o próprio "Tentar novamente"). Quem decide se o bloco
 * aparece é a página (permissão + dado não nulo). O conteúdo só é montado com os dados prontos.
 */

/** Contagens do backend por status; cada uma leva à lista de membros já filtrada. */
const CONTAGENS = Object.freeze([
  { campo: 'totalMembros', rotulo: 'Total', icone: 'membros', status: null },
  { campo: 'membrosAtivos', rotulo: 'Ativos', icone: 'sucesso', status: STATUS_MEMBRO.ATIVO },
  { campo: 'membrosAfastados', rotulo: 'Afastados', icone: 'alerta', status: STATUS_MEMBRO.AFASTADO },
  { campo: 'membrosVisitantes', rotulo: 'Visitantes', icone: 'info', status: STATUS_MEMBRO.VISITANTE },
]);

/** Total, ativos, afastados e visitantes (contados no banco), e a proporção de ativos em barra e por extenso. */
export function BlocoMembros({ estado, dashboard }) {
  return (
    <BlocoDoPainel titulo="Membros" link={{ para: ROTAS.MEMBROS, rotulo: 'Ver membros' }} estado={estado} pronto={Boolean(dashboard)}>
      {() => {
        const { totalMembros: total, membrosAtivos: ativos } = dashboard;
        const fracao = total > 0 ? ativos / total : 0;
        return (
          <>
            <div className={styles.indicadores}>
              {CONTAGENS.map(({ campo, rotulo, icone, status }) => (
                <Link key={campo} className={styles.indicador} to={status ? `${ROTAS.MEMBROS}?status=${status}` : ROTAS.MEMBROS}>
                  <span className={styles.indicadorRotulo}>
                    <Icon nome={icone} tamanho={18} /> {rotulo}
                  </span>
                  <span className={styles.indicadorValor}>{NUMERO.format(dashboard[campo])}</span>
                </Link>
              ))}
            </div>
            <div className={styles.medidor}>
              <div
                className={styles.medidorTrilho}
                role="meter"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={ativos}
                aria-label="Membros ativos"
                aria-valuetext={`${ativos} de ${total} membros ativos`}
              >
                <span className={styles.medidorValor} style={{ width: `${fracao * 100}%` }} />
              </div>
              <p className={styles.nota}>{PERCENTUAL.format(fracao)} dos membros estão ativos</p>
            </div>
          </>
        );
      }}
    </BlocoDoPainel>
  );
}

/** Até 5 eventos a partir de hoje (o backend escolhe e ordena); cada um leva aos detalhes. */
export function BlocoProximosEventos({ estado, dashboard }) {
  const { pode } = usePermissao();
  return (
    <BlocoDoPainel titulo="Próximos eventos" link={{ para: ROTAS.EVENTOS, rotulo: 'Ver agenda' }} estado={estado} pronto={Boolean(dashboard)}>
      {() =>
        dashboard.proximosEventos.length === 0 ? (
          <p className={styles.vazio}>
            Nenhum evento agendado. {pode(PERMISSOES.EVENTOS_CRIAR) && <Link to={caminhoNovoEvento()}>Cadastrar evento</Link>}
          </p>
        ) : (
          <ul className={styles.lista}>
            {dashboard.proximosEventos.map((evento) => (
              <li key={evento.id}>
                <Link className={styles.item} to={caminhoDoEvento(evento.id)}>
                  <span className={styles.itemTitulo}>{evento.titulo}</span>
                  <span className={styles.itemMeta}>
                    {formatarDataPorExtenso(evento.data)} · {formatarHorario(evento.horario)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )
      }
    </BlocoDoPainel>
  );
}

/** Aniversariantes do mês atual da igreja (mês do Clock do servidor), na ordem do dia. */
export function BlocoAniversariantes({ estado, dashboard, hoje }) {
  const diaDeHoje = hoje.slice(5);
  return (
    <BlocoDoPainel titulo="Aniversariantes do mês" estado={estado} pronto={Boolean(dashboard)}>
      {() =>
        dashboard.aniversariantesDoMes.length === 0 ? (
          <p className={styles.vazio}>Nenhum aniversariante neste mês.</p>
        ) : (
          <ul className={styles.lista}>
            {dashboard.aniversariantesDoMes.map((membro) => (
              <li key={membro.id}>
                <Link className={styles.item} to={caminhoDoMembro(membro.id)}>
                  <span className={styles.itemTitulo}>{membro.nome}</span>
                  <span className={styles.itemMeta}>
                    {formatarData(membro.dataNascimento).slice(0, 5)}
                    {membro.dataNascimento.slice(5) === diaDeHoje && <strong className={styles.hoje}> · Hoje</strong>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )
      }
    </BlocoDoPainel>
  );
}

/**
 * Novos membros (história do Pastor): os cadastrados nos últimos 30 dias, mais recentes primeiro
 * (o backend manda no máximo 10 e o total à parte). Membros de antes da data de cadastro existir
 * nunca aparecem aqui.
 */
export function BlocoNovosMembros({ estado, dashboard }) {
  return (
    <BlocoDoPainel titulo="Novos membros" estado={estado} pronto={Boolean(dashboard)}>
      {() => {
        const { novosMembros, totalNovosMembros } = dashboard;
        if (totalNovosMembros === 0) {
          return <p className={styles.vazio}>Nenhum membro cadastrado nos últimos {DIAS_NOVOS_MEMBROS} dias.</p>;
        }
        return (
          <>
            <p className={styles.nota}>
              {NUMERO.format(totalNovosMembros)} {totalNovosMembros === 1 ? 'cadastro' : 'cadastros'} nos últimos {DIAS_NOVOS_MEMBROS} dias
              {totalNovosMembros > novosMembros.length && ` (mostrando os ${novosMembros.length} mais recentes)`}
            </p>
            <ul className={styles.lista}>
              {novosMembros.map((membro) => (
                <li key={membro.id}>
                  <Link className={styles.item} to={caminhoDoMembro(membro.id)}>
                    <span className={styles.itemTitulo}>{membro.nome}</span>
                    <span className={styles.itemMeta}>
                      Cadastrado em {formatarDataHora(membro.criadoEm)} <MembroStatusBadge status={membro.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        );
      }}
    </BlocoDoPainel>
  );
}
