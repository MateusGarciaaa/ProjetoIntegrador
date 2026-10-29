import { FUSO_HORARIO_SERVIDOR } from '../../../constants/eventos';
import { PERFIS } from '../../../constants/perfis';
import { TIPOS_MOVIMENTACAO } from '../../../constants/financeiro';
import { STATUS_MEMBRO } from '../../../constants/statusMembro';
import { limitesDoMes, mesDaData, somarDias } from '../../../utils/calendario';
import { agoraNoFuso } from '../../../utils/datas';
import { centavosParaValor, paraCentavos } from '../../../utils/moeda';
import { dataHoraDoServidor } from '../bancoEmMemoria';
import { ok } from '../respostas';

const { ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO, MEMBRO } = PERFIS;

/**
 * VisibilidadeDashboard do backend, transcrita aqui de forma independente da matriz do frontend:
 * membros (contagens por status, aniversariantes e novos membros) para A P S; resumo financeiro para A P T; eventos para todos.
 */
const VEEM_MEMBROS = Object.freeze([ADMINISTRADOR, PASTOR, SECRETARIO]);
const VEEM_FINANCEIRO = Object.freeze([ADMINISTRADOR, PASTOR, TESOUREIRO]);
const LIMITE_PROXIMOS_EVENTOS = 5;
/** DashboardService.DIAS_NOVOS_MEMBROS e o Top10 do MembroRepository. */
const DIAS_NOVOS_MEMBROS = 30;
const LIMITE_NOVOS_MEMBROS = 10;

/** findTop5ByDataGreaterThanEqualOrderByDataAscHorarioAsc: inclui os eventos de hoje, mesmo os que já começaram. */
function proximosEventos(banco, hoje) {
  return banco.eventos
    .filter((e) => e.data >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario))
    .slice(0, LIMITE_PROXIMOS_EVENTOS)
    .map(({ id, titulo, data, horario }) => ({ id, titulo, data, horario }));
}

/** buscarAniversariantesDoMes: mês do Clock (fuso da igreja), ordenado pelo dia. */
function aniversariantesDoMes(banco, hoje) {
  const mes = hoje.slice(5, 7);
  return banco.membros
    .filter((m) => m.dataNascimento && m.dataNascimento.slice(5, 7) === mes)
    .sort((a, b) => a.dataNascimento.slice(8).localeCompare(b.dataNascimento.slice(8)))
    .map(({ id, nome, dataNascimento }) => ({ id, nome, dataNascimento }));
}

function resumoDoMes(banco, hoje) {
  const { inicio, fim } = limitesDoMes(mesDaData(hoje));
  let receitas = 0;
  let despesas = 0;
  banco.movimentacoes
    .filter((m) => m.data >= inicio && m.data <= fim)
    .forEach((m) => {
      if (m.tipo === TIPOS_MOVIMENTACAO.RECEITA) receitas += paraCentavos(m.valor);
      else despesas += paraCentavos(m.valor);
    });
  return {
    dataInicio: inicio,
    dataFim: fim,
    totalReceitas: centavosParaValor(receitas),
    totalDespesas: centavosParaValor(despesas),
    saldo: centavosParaValor(receitas - despesas),
  };
}

/**
 * findTop10ByCriadoEmGreaterThanEqualOrderByCriadoEmDescNomeAsc: cadastrados desde agora − 30 dias
 * (criadoEm null nunca entra), mais recentes primeiro. LocalDateTime em texto ISO: compara como texto.
 */
function novosMembros(banco, agoraMs) {
  const agora = dataHoraDoServidor(agoraMs);
  const desde = `${somarDias(agora.slice(0, 10), -DIAS_NOVOS_MEMBROS)}${agora.slice(10)}`;
  return banco.membros
    .filter((m) => m.criadoEm && m.criadoEm >= desde)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm) || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map(({ id, nome, status, criadoEm }) => ({ id, nome, status, criadoEm }));
}

function contarStatus(banco, status) {
  return banco.membros.filter((m) => m.status === status).length;
}

/** DashboardService.gerar: bloco que o perfil não vê vem null. */
export function obter({ banco, usuario, agoraMs }) {
  const hoje = agoraNoFuso(FUSO_HORARIO_SERVIDOR, new Date(agoraMs)).data;
  const membros = VEEM_MEMBROS.includes(usuario.perfil);
  const novos = membros ? novosMembros(banco, agoraMs) : null;
  return ok(200, {
    totalMembros: membros ? banco.membros.length : null,
    membrosAtivos: membros ? contarStatus(banco, STATUS_MEMBRO.ATIVO) : null,
    membrosAfastados: membros ? contarStatus(banco, STATUS_MEMBRO.AFASTADO) : null,
    membrosVisitantes: membros ? contarStatus(banco, STATUS_MEMBRO.VISITANTE) : null,
    proximosEventos: proximosEventos(banco, hoje),
    aniversariantesDoMes: membros ? aniversariantesDoMes(banco, hoje) : null,
    novosMembros: novos ? novos.slice(0, LIMITE_NOVOS_MEMBROS) : null,
    totalNovosMembros: novos ? novos.length : null,
    resumoFinanceiroMesAtual: VEEM_FINANCEIRO.includes(usuario.perfil) ? resumoDoMes(banco, hoje) : null,
  });
}

/** DashboardController: @PreAuthorize("isAuthenticated()"). */
export const ROTAS_DASHBOARD = Object.freeze([
  { metodo: 'get', padrao: /^\/dashboard$/, perfis: [ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO, MEMBRO], executar: obter },
]);
