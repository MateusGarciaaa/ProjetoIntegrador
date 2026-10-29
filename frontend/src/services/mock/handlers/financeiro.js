import { LIMITE_NOME_CATEGORIA, LIMITES_MOVIMENTACAO, TIPOS_MOVIMENTACAO } from '../../../constants/financeiro';
import { PERFIS } from '../../../constants/perfis';
import { isDataIsoValida } from '../../../utils/datas';
import { centavosParaValor, paraCentavos } from '../../../utils/moeda';
import { novoId } from '../bancoEmMemoria';
import { lerPageable, paginaSpring } from '../paginacao';
import { erroApi, ok } from '../respostas';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Texto que o Jackson aceita num BigDecimal (número JSON ou texto numérico). */
const NUMERO_JACKSON = /^-?\d+(\.\d+)?$/;
const TIPOS = Object.values(TIPOS_MOVIMENTACAO);

/** Atributos simples da entidade MovimentacaoFinanceira; outro campo no sort gera 400 (PropertyReferenceException). */
const CAMPOS_ORDENAVEIS = ['id', 'descricao', 'valor', 'data', 'tipo'];

export const MENSAGENS_FINANCEIRO = Object.freeze({
  MOVIMENTACAO_INEXISTENTE: 'Movimentação financeira não encontrada',
  CATEGORIA_INEXISTENTE: 'Categoria financeira não encontrada',
  MEMBRO_INEXISTENTE: 'Membro não encontrado',
  CATEGORIA_DUPLICADA: 'Já existe uma categoria com este nome para este tipo',
  PERIODO_INVERTIDO: 'A data inicial não pode ser posterior à data final',
});

function textoDoNumero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? String(valor) : null;
  return typeof valor === 'string' ? valor.trim() : null;
}

function uuidRuim(valor) {
  return valor != null && !(typeof valor === 'string' && UUID.test(valor));
}

/** Falhas de desserialização viram 400 fixo (HttpMessageNotReadableException): valor, data, enum ou UUID inválidos. */
export function corpoMovimentacaoIlegivel(corpo) {
  if (!corpo || typeof corpo !== 'object') return true;
  const valorRuim = corpo.valor != null && !NUMERO_JACKSON.test(textoDoNumero(corpo.valor) ?? '');
  const dataRuim = corpo.data != null && !(typeof corpo.data === 'string' && isDataIsoValida(corpo.data));
  const tipoRuim = corpo.tipo != null && !TIPOS.includes(corpo.tipo);
  return valorRuim || dataRuim || tipoRuim || uuidRuim(corpo.categoriaId) || uuidRuim(corpo.membroId);
}

/** @Digits(integer = 10, fraction = 2) do BigDecimal: conta os dígitos do texto do número. */
function excedeDigitos(valor) {
  const [inteiros, decimais = ''] = textoDoNumero(valor).replace('-', '').split('.');
  return inteiros.replace(/^0+/, '').length > LIMITES_MOVIMENTACAO.digitosInteiros || decimais.length > LIMITES_MOVIMENTACAO.casasDecimais;
}

/** Mesmas regras e mensagens das anotações do MovimentacaoFinanceiraRequest, na ordem dos campos do record. */
export function validarMovimentacaoRequest(corpo) {
  const erros = [];
  const { descricao, valor, data, tipo, categoriaId } = corpo;

  if (typeof descricao !== 'string' || !descricao.trim()) erros.push('A descrição é obrigatória');
  if (typeof descricao === 'string' && descricao.length > LIMITES_MOVIMENTACAO.descricao) {
    erros.push(`A descrição deve ter no máximo ${LIMITES_MOVIMENTACAO.descricao} caracteres`);
  }
  if (valor == null) erros.push('O valor é obrigatório');
  else {
    // @DecimalMin("0.01"): zero e negativos (RN06/RN07).
    if (Number(textoDoNumero(valor)) < 0.01) erros.push('O valor deve ser positivo');
    if (excedeDigitos(valor)) erros.push('O valor deve ter até 10 dígitos inteiros e 2 casas decimais');
  }
  if (data == null) erros.push('A data é obrigatória');
  if (tipo == null) erros.push('O tipo é obrigatório');
  // RN10: categoria obrigatória.
  if (categoriaId == null) erros.push('A categoria é obrigatória');

  return erros;
}

/** Mesmas regras e mensagens do CategoriaFinanceiraRequest. */
export function validarCategoriaRequest(corpo) {
  const erros = [];
  const { nome, tipo } = corpo;
  if (typeof nome !== 'string' || !nome.trim()) erros.push('O nome da categoria é obrigatório');
  if (typeof nome === 'string' && nome.length > LIMITE_NOME_CATEGORIA) {
    erros.push(`O nome da categoria deve ter no máximo ${LIMITE_NOME_CATEGORIA} caracteres`);
  }
  if (tipo == null) erros.push('O tipo da categoria é obrigatório');
  return erros;
}

function corpoCategoriaIlegivel(corpo) {
  return !corpo || typeof corpo !== 'object' || (corpo.tipo != null && !TIPOS.includes(corpo.tipo));
}

function copiarCategoria({ id, nome, tipo }) {
  return { id, nome, tipo };
}

/** MovimentacaoFinanceiraMapper.toResponse: categoria e nome do membro lidos agora, como pelo JOIN. */
function paraResponse(banco, movimentacao) {
  const categoria = banco.categorias.find((c) => c.id === movimentacao.categoriaId);
  const membro = movimentacao.membroId ? banco.membros.find((m) => m.id === movimentacao.membroId) : null;
  return {
    id: movimentacao.id,
    descricao: movimentacao.descricao,
    valor: movimentacao.valor,
    data: movimentacao.data,
    tipo: movimentacao.tipo,
    categoria: copiarCategoria(categoria),
    membroId: membro?.id ?? null,
    membroNome: membro?.nome ?? null,
  };
}

function comparar(a, b, campo) {
  if (a[campo] == null) return b[campo] == null ? 0 : 1;
  if (b[campo] == null) return -1;
  if (typeof a[campo] === 'number' && typeof b[campo] === 'number') return a[campo] - b[campo];
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

/** @DateTimeFormat(iso = DATE): formato ou data inexistente → 400 (antes do @PreAuthorize). */
function validarParametrosPeriodo(params) {
  for (const nome of ['dataInicio', 'dataFim']) {
    const valor = params[nome];
    if (valor != null && valor !== '' && !isDataIsoValida(valor)) return `Valor inválido para o parâmetro '${nome}'.`;
  }
  return null;
}

function validarDatasObrigatorias(params) {
  for (const nome of ['dataInicio', 'dataFim']) {
    const valor = params[nome];
    if (valor == null || valor === '') return `Parâmetro obrigatório ausente: '${nome}'.`;
    if (!isDataIsoValida(valor)) return `Valor inválido para o parâmetro '${nome}'.`;
  }
  return null;
}

function validarCategoriaId({ categoriaId }) {
  if (categoriaId != null && categoriaId !== '' && !UUID.test(categoriaId)) return "Valor inválido para o parâmetro 'categoriaId'.";
  return null;
}

/**
 * /summary e /summary/categories: datas obrigatórias, tipo e categoriaId opcionais; o Spring resolve
 * os argumentos na ordem do método (dataInicio, dataFim, tipo, categoriaId).
 */
function validarParametrosResumo(params) {
  return validarDatasObrigatorias(params) ?? validarParametroTipo(params) ?? validarCategoriaId(params);
}

const AGRUPAMENTO_MES = 'MES';
const AGRUPAMENTOS_SERIE = Object.freeze(['DIA', AGRUPAMENTO_MES]);

/** /summary/series: dataInicio, dataFim, agrupamento (obrigatório, enum DIA|MES), tipo, categoriaId. */
function validarParametrosSerie(params) {
  const erroDasDatas = validarDatasObrigatorias(params);
  if (erroDasDatas) return erroDasDatas;
  const { agrupamento } = params;
  if (agrupamento == null || agrupamento === '') return "Parâmetro obrigatório ausente: 'agrupamento'.";
  if (!AGRUPAMENTOS_SERIE.includes(agrupamento)) return "Valor inválido para o parâmetro 'agrupamento'.";
  return validarParametroTipo(params) ?? validarCategoriaId(params);
}

function validarParametroTipo(params) {
  const { tipo } = params;
  if (tipo == null || tipo === '' || TIPOS.includes(tipo)) return null;
  return "Valor inválido para o parâmetro 'tipo'.";
}

/**
 * GET /financial: o Spring resolve os argumentos na ordem do método (dataInicio, dataFim, tipo,
 * categoriaId); tipo fora do enum (inclusive minúsculo) ou categoriaId que não é UUID → 400.
 */
function validarParametrosLista(params) {
  const erroDoPeriodo = validarParametrosPeriodo(params);
  if (erroDoPeriodo) return erroDoPeriodo;
  return validarParametroTipo(params) ?? validarCategoriaId(params);
}

function noPeriodo(movimentacao, dataInicio, dataFim) {
  return movimentacao.data >= dataInicio && movimentacao.data <= dataFim;
}

/** @PageableDefault(size = 20, sort = "data") do controller: sem desempate. */
const ORDENACAO_PADRAO = 'data';

/**
 * GET /financial: filtros opcionais e combinados (MovimentacaoFinanceiraFiltros). O período só filtra
 * (inclusivo) com os dois limites; categoria inexistente não é erro, só não acha nada.
 */
export function listar({ banco, params, caminho }) {
  const { pagina, tamanho, criterios } = lerPageable(params, ORDENACAO_PADRAO);
  const invalido = criterios.find(({ campo }) => !CAMPOS_ORDENAVEIS.includes(campo));
  if (invalido) return erroApi(400, `Campo de ordenação inválido: '${invalido.campo}'.`, caminho);

  const { dataInicio, dataFim } = params;
  const tipo = params.tipo || null;
  const categoriaId = params.categoriaId || null;
  const filtrarPeriodo = Boolean(dataInicio) && Boolean(dataFim);
  const encontradas = banco.movimentacoes.filter(
    (m) =>
      (!filtrarPeriodo || noPeriodo(m, dataInicio, dataFim)) &&
      (!tipo || m.tipo === tipo) &&
      (!categoriaId || m.categoriaId === categoriaId),
  );
  const ordenadas = encontradas.sort(compararPorCriterios(criterios)).map((m) => paraResponse(banco, m));
  return ok(200, paginaSpring(ordenadas, { pagina, tamanho }));
}

export function buscarPorId({ banco, id, caminho }) {
  const movimentacao = banco.movimentacoes.find((m) => m.id === id);
  return movimentacao ? ok(200, paraResponse(banco, movimentacao)) : erroApi(404, MENSAGENS_FINANCEIRO.MOVIMENTACAO_INEXISTENTE, caminho);
}

/**
 * Agregações (MovimentacaoFinanceiraAgregacoes): mesmos filtros da lista, com o período obrigatório.
 * Período invertido é BusinessException do serviço (400, depois do @PreAuthorize).
 */
function movimentacoesAgregadas(banco, params) {
  const tipo = params.tipo || null;
  const categoriaId = params.categoriaId || null;
  return banco.movimentacoes.filter(
    (m) => noPeriodo(m, params.dataInicio, params.dataFim) && (!tipo || m.tipo === tipo) && (!categoriaId || m.categoriaId === categoriaId),
  );
}

function periodoInvertido({ dataInicio, dataFim }, caminho) {
  return dataInicio > dataFim ? erroApi(400, MENSAGENS_FINANCEIRO.PERIODO_INVERTIDO, caminho) : null;
}

/** SUM(CASE WHEN tipo = RECEITA ...) e SUM(CASE WHEN tipo = DESPESA ...), em centavos. */
function somarCentavos(movimentacoes) {
  let receitas = 0;
  let despesas = 0;
  movimentacoes.forEach((m) => {
    if (m.tipo === TIPOS_MOVIMENTACAO.RECEITA) receitas += paraCentavos(m.valor);
    else despesas += paraCentavos(m.valor);
  });
  return { receitas, despesas };
}

function totaisParaJson({ receitas, despesas }) {
  return {
    totalReceitas: centavosParaValor(receitas),
    totalDespesas: centavosParaValor(despesas),
    saldo: centavosParaValor(receitas - despesas),
  };
}

/** GET /financial/summary: período, tipo e categoria; saldo = receitas − despesas. */
export function resumo({ banco, params, caminho }) {
  const erro = periodoInvertido(params, caminho);
  if (erro) return erro;
  const { dataInicio, dataFim } = params;
  return ok(200, { dataInicio, dataFim, ...totaisParaJson(somarCentavos(movimentacoesAgregadas(banco, params))) });
}

/** GET /financial/summary/series: só os dias (ou meses, no 1º dia) com lançamento, em ordem de data. */
export function serie({ banco, params, caminho }) {
  const erro = periodoInvertido(params, caminho);
  if (erro) return erro;
  const grupos = new Map();
  movimentacoesAgregadas(banco, params).forEach((m) => {
    const periodo = params.agrupamento === AGRUPAMENTO_MES ? `${m.data.slice(0, 7)}-01` : m.data;
    grupos.set(periodo, [...(grupos.get(periodo) ?? []), m]);
  });
  const pontos = [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, movimentacoes]) => ({ periodo, ...totaisParaJson(somarCentavos(movimentacoes)) }));
  return ok(200, pontos);
}

/** GET /financial/summary/categories: total e quantidade por categoria, do maior total para o menor (empate: nome). */
export function totaisPorCategoria({ banco, params, caminho }) {
  const erro = periodoInvertido(params, caminho);
  if (erro) return erro;
  const grupos = new Map();
  movimentacoesAgregadas(banco, params).forEach((m) => {
    const grupo = grupos.get(m.categoriaId) ?? { centavos: 0, quantidade: 0 };
    grupos.set(m.categoriaId, { centavos: grupo.centavos + paraCentavos(m.valor), quantidade: grupo.quantidade + 1 });
  });
  const linhas = [...grupos.entries()]
    .map(([categoriaId, { centavos, quantidade }]) => ({
      categoria: copiarCategoria(banco.categorias.find((c) => c.id === categoriaId)),
      centavos,
      quantidade,
    }))
    .sort((a, b) => b.centavos - a.centavos || a.categoria.nome.localeCompare(b.categoria.nome, 'pt-BR'))
    .map(({ categoria, centavos, quantidade }) => ({ categoria, total: centavosParaValor(centavos), quantidade }));
  return ok(200, linhas);
}

/** Ordem do serviço: categoria existe → tipo compatível (BusinessException, 400) → membro existe. */
function validarRelacoes(banco, corpo, caminho) {
  const categoria = banco.categorias.find((c) => c.id === corpo.categoriaId);
  if (!categoria) return erroApi(404, MENSAGENS_FINANCEIRO.CATEGORIA_INEXISTENTE, caminho);
  if (categoria.tipo !== corpo.tipo) {
    return erroApi(400, `O tipo da movimentação (${corpo.tipo}) não é compatível com o tipo da categoria (${categoria.tipo})`, caminho);
  }
  if (corpo.membroId != null && !banco.membros.some((m) => m.id === corpo.membroId)) {
    return erroApi(404, MENSAGENS_FINANCEIRO.MEMBRO_INEXISTENTE, caminho);
  }
  return null;
}

/** NUMERIC(12,2): o banco guarda com 2 casas; o Jackson devolve como número JSON. */
function paraEntidade(corpo, id) {
  return {
    id,
    descricao: corpo.descricao,
    valor: centavosParaValor(paraCentavos(corpo.valor)),
    data: corpo.data,
    tipo: corpo.tipo,
    categoriaId: corpo.categoriaId,
    membroId: corpo.membroId ?? null,
  };
}

export function cadastrar({ banco, corpo, caminho }) {
  const erro = validarRelacoes(banco, corpo, caminho);
  if (erro) return erro;
  const movimentacao = paraEntidade(corpo, novoId());
  banco.movimentacoes.push(movimentacao);
  return ok(201, paraResponse(banco, movimentacao));
}

export function atualizar({ banco, id, corpo, caminho }) {
  const indice = banco.movimentacoes.findIndex((m) => m.id === id);
  if (indice < 0) return erroApi(404, MENSAGENS_FINANCEIRO.MOVIMENTACAO_INEXISTENTE, caminho);
  const erro = validarRelacoes(banco, corpo, caminho);
  if (erro) return erro;
  banco.movimentacoes[indice] = paraEntidade(corpo, id);
  return ok(200, paraResponse(banco, banco.movimentacoes[indice]));
}

export function excluir({ banco, id, caminho }) {
  const indice = banco.movimentacoes.findIndex((m) => m.id === id);
  if (indice < 0) return erroApi(404, MENSAGENS_FINANCEIRO.MOVIMENTACAO_INEXISTENTE, caminho);
  banco.movimentacoes.splice(indice, 1);
  return ok(204);
}

/** GET /financial-categories: findByTipo ou findAll, sem ordem garantida (aqui, a de cadastro). */
export function listarCategorias({ banco, params }) {
  const { tipo } = params;
  return ok(200, banco.categorias.filter((c) => !tipo || c.tipo === tipo).map(copiarCategoria));
}

/** existsByNomeAndTipo: comparação exata (maiúsculas e espaços contam), como a UNIQUE (nome, tipo). */
export function cadastrarCategoria({ banco, corpo, caminho }) {
  if (banco.categorias.some((c) => c.nome === corpo.nome && c.tipo === corpo.tipo)) {
    return erroApi(409, MENSAGENS_FINANCEIRO.CATEGORIA_DUPLICADA, caminho);
  }
  const categoria = { id: novoId(), nome: corpo.nome, tipo: corpo.tipo };
  banco.categorias.push(categoria);
  return ok(201, copiarCategoria(categoria));
}

const { ADMINISTRADOR, PASTOR, TESOUREIRO } = PERFIS;
const CONSULTA = [ADMINISTRADOR, TESOUREIRO, PASTOR];
const ESCRITA = [ADMINISTRADOR, TESOUREIRO];
const CORPO_MOVIMENTACAO = Object.freeze({ ilegivel: corpoMovimentacaoIlegivel, validar: validarMovimentacaoRequest });
const CORPO_CATEGORIA = Object.freeze({ ilegivel: corpoCategoriaIlegivel, validar: validarCategoriaRequest });

/**
 * Rotas do MovimentacaoFinanceiraController e do CategoriaFinanceiraController; "perfis" repete os
 * @PreAuthorize, independente da matriz do frontend. /financial/summary vem antes de /financial/{id}:
 * senão "summary" seria lido como id (400 de UUID).
 */
export const ROTAS_FINANCEIRO = Object.freeze([
  { metodo: 'get', padrao: /^\/financial$/, perfis: CONSULTA, parametros: validarParametrosLista, executar: listar },
  { metodo: 'post', padrao: /^\/financial$/, perfis: ESCRITA, corpo: CORPO_MOVIMENTACAO, executar: cadastrar },
  { metodo: 'get', padrao: /^\/financial\/summary$/, perfis: CONSULTA, parametros: validarParametrosResumo, executar: resumo },
  { metodo: 'get', padrao: /^\/financial\/summary\/series$/, perfis: CONSULTA, parametros: validarParametrosSerie, executar: serie },
  {
    metodo: 'get',
    padrao: /^\/financial\/summary\/categories$/,
    perfis: CONSULTA,
    parametros: validarParametrosResumo,
    executar: totaisPorCategoria,
  },
  { metodo: 'get', padrao: /^\/financial\/([^/]+)$/, perfis: CONSULTA, executar: buscarPorId },
  { metodo: 'put', padrao: /^\/financial\/([^/]+)$/, perfis: ESCRITA, corpo: CORPO_MOVIMENTACAO, executar: atualizar },
  { metodo: 'delete', padrao: /^\/financial\/([^/]+)$/, perfis: [ADMINISTRADOR], executar: excluir },
  { metodo: 'get', padrao: /^\/financial-categories$/, perfis: CONSULTA, parametros: validarParametroTipo, executar: listarCategorias },
  { metodo: 'post', padrao: /^\/financial-categories$/, perfis: ESCRITA, corpo: CORPO_CATEGORIA, executar: cadastrarCategoria },
]);
