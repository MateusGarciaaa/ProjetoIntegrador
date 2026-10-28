import { FUSO_HORARIO_SERVIDOR, LIMITES_EVENTO } from '../../../constants/eventos';
import { PERFIS } from '../../../constants/perfis';
import { agoraNoFuso, horarioComSegundos, isDataIsoValida } from '../../../utils/datas';
import { novoId } from '../bancoEmMemoria';
import { lerPageable, paginaSpring } from '../paginacao';
import { erroApi, ok } from '../respostas';

/** Atributos da entidade Evento: qualquer outro campo no sort gera 400 (PropertyReferenceException). */
const CAMPOS_ORDENAVEIS = ['id', 'titulo', 'descricao', 'data', 'horario', 'local'];
/** LocalTime do Jackson aceita "HH:mm", "HH:mm:ss" e frações. */
const HORARIO_JACKSON = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,9})?)?$/;

/** Mensagem exata da ConflictException (409) do EventoService.atualizar (RN09). */
export const MENSAGEM_RN09 = 'Este evento já foi encerrado e só pode ser editado por um administrador';

function copiar(evento) {
  return { ...evento };
}

/** Falhas de desserialização (data ou horário inválidos) viram 400 no backend (HttpMessageNotReadableException). */
export function corpoIlegivel(corpo) {
  if (!corpo || typeof corpo !== 'object') return true;
  const dataRuim = corpo.data != null && !(typeof corpo.data === 'string' && isDataIsoValida(corpo.data));
  const horarioRuim = corpo.horario != null && !(typeof corpo.horario === 'string' && HORARIO_JACKSON.test(corpo.horario));
  return dataRuim || horarioRuim;
}

/** Mesmas regras e mensagens das anotações do EventoRequest, na ordem dos campos do record. */
export function validarEventoRequest(corpo) {
  const erros = [];
  const { titulo, descricao, data, horario, local } = corpo;
  const excede = (valor, limite) => typeof valor === 'string' && valor.length > limite;

  if (typeof titulo !== 'string' || !titulo.trim()) erros.push('O título é obrigatório');
  if (excede(titulo, LIMITES_EVENTO.titulo)) erros.push(`O título deve ter no máximo ${LIMITES_EVENTO.titulo} caracteres`);
  if (excede(descricao, LIMITES_EVENTO.descricao)) erros.push(`A descrição deve ter no máximo ${LIMITES_EVENTO.descricao} caracteres`);
  if (data == null) erros.push('A data é obrigatória');
  if (horario == null) erros.push('O horário é obrigatório');
  if (excede(local, LIMITES_EVENTO.local)) erros.push(`O local deve ter no máximo ${LIMITES_EVENTO.local} caracteres`);

  return erros;
}

/** Como o Jackson devolve um LocalTime: sempre com segundos ("19:30" → "19:30:00"). */
function paraEntidade(corpo, id) {
  return {
    id,
    titulo: corpo.titulo,
    descricao: corpo.descricao ?? null,
    data: corpo.data,
    horario: horarioComSegundos(corpo.horario),
    local: corpo.local ?? null,
  };
}

/**
 * EventoService.jaEncerrado: LocalDateTime.of(data, horario).isBefore(LocalDateTime.now(clock)), com o
 * Clock no fuso da igreja (America/Sao_Paulo). No mesmo segundo já conta como encerrado (o now() tem frações).
 */
function jaEncerrado(evento, agoraMs) {
  const agora = agoraNoFuso(FUSO_HORARIO_SERVIDOR, new Date(agoraMs));
  return `${evento.data} ${evento.horario}` <= `${agora.data} ${agora.horario}`;
}

function comparar(a, b, campo) {
  if (a[campo] == null) return b[campo] == null ? 0 : 1;
  if (b[campo] == null) return -1;
  return String(a[campo]).localeCompare(String(b[campo]), 'pt-BR');
}

function compararPorCriterios(criterios) {
  return (a, b) => {
    for (const { campo, direcao } of criterios) {
      const resultado = comparar(a, b, campo) * (direcao === 'DESC' ? -1 : 1);
      if (resultado !== 0) return resultado;
    }
    return 0;
  };
}

/**
 * @DateTimeFormat(iso = DATE) em dataInicio/dataFim: texto vazio vira null; formato ou data
 * inexistente → MethodArgumentTypeMismatchException → 400 (antes do @PreAuthorize).
 */
function validarParametrosPeriodo(params) {
  for (const nome of ['dataInicio', 'dataFim']) {
    const valor = params[nome];
    if (valor != null && valor !== '' && !isDataIsoValida(valor)) return `Valor inválido para o parâmetro '${nome}'.`;
  }
  return null;
}

/** @PageableDefault(sort = {"data", "horario", "id"}) do EventoController. */
const ORDENACAO_PADRAO = ['data', 'horario', 'id'];

/** GET /events: EventoService.listar só filtra (findByDataBetween, inclusivo) quando os dois limites vêm. */
export function listar({ banco, params, caminho }) {
  const { pagina, tamanho, criterios } = lerPageable(params, ORDENACAO_PADRAO);
  const invalido = criterios.find(({ campo }) => !CAMPOS_ORDENAVEIS.includes(campo));
  if (invalido) return erroApi(400, `Campo de ordenação inválido: '${invalido.campo}'.`, caminho);

  const { dataInicio, dataFim } = params;
  const filtrar = Boolean(dataInicio) && Boolean(dataFim);
  const encontrados = filtrar ? banco.eventos.filter((e) => e.data >= dataInicio && e.data <= dataFim) : [...banco.eventos];
  return ok(200, paginaSpring(encontrados.sort(compararPorCriterios(criterios)).map(copiar), { pagina, tamanho }));
}

export function buscarPorId({ banco, id, caminho }) {
  const evento = banco.eventos.find((e) => e.id === id);
  return evento ? ok(200, copiar(evento)) : erroApi(404, 'Evento não encontrado', caminho);
}

export function cadastrar({ banco, corpo }) {
  const evento = paraEntidade(corpo, novoId());
  banco.eventos.push(evento);
  return ok(201, copiar(evento));
}

/** RN09 olha o evento gravado (não os valores novos) e só libera o ROLE_ADMINISTRADOR. */
export function atualizar({ banco, id, corpo, caminho, usuario, agoraMs }) {
  const indice = banco.eventos.findIndex((e) => e.id === id);
  if (indice < 0) return erroApi(404, 'Evento não encontrado', caminho);
  if (usuario.perfil !== PERFIS.ADMINISTRADOR && jaEncerrado(banco.eventos[indice], agoraMs)) {
    return erroApi(409, MENSAGEM_RN09, caminho);
  }
  banco.eventos[indice] = paraEntidade(corpo, id);
  return ok(200, copiar(banco.eventos[indice]));
}

export function excluir({ banco, id, caminho }) {
  const indice = banco.eventos.findIndex((e) => e.id === id);
  if (indice < 0) return erroApi(404, 'Evento não encontrado', caminho);
  banco.eventos.splice(indice, 1);
  return ok(204);
}

const { ADMINISTRADOR, SECRETARIO } = PERFIS;
/** isAuthenticated(): qualquer perfil logado. */
const TODOS_OS_PERFIS = Object.values(PERFIS);
const CORPO_EVENTO = Object.freeze({ ilegivel: corpoIlegivel, validar: validarEventoRequest });

/** Rotas do EventoController; "perfis" repete os @PreAuthorize, independente da matriz do frontend. */
export const ROTAS_EVENTOS = Object.freeze([
  {
    metodo: 'get',
    padrao: /^\/events$/,
    perfis: TODOS_OS_PERFIS,
    parametros: validarParametrosPeriodo,
    executar: listar,
  },
  { metodo: 'post', padrao: /^\/events$/, perfis: [ADMINISTRADOR, SECRETARIO], corpo: CORPO_EVENTO, executar: cadastrar },
  { metodo: 'get', padrao: /^\/events\/([^/]+)$/, perfis: TODOS_OS_PERFIS, executar: buscarPorId },
  { metodo: 'put', padrao: /^\/events\/([^/]+)$/, perfis: [ADMINISTRADOR, SECRETARIO], corpo: CORPO_EVENTO, executar: atualizar },
  { metodo: 'delete', padrao: /^\/events\/([^/]+)$/, perfis: [ADMINISTRADOR], executar: excluir },
]);
