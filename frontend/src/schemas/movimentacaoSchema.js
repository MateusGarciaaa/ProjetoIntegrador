import { infoTipoMovimentacao, isTipoMovimentacaoValido, LIMITES_MOVIMENTACAO } from '../constants/financeiro';
import { dataBrParaIso, formatarData, formatarDataDigitada } from '../utils/datas';
import { centavosParaValor, lerCentavosBr, mascararValorDigitado, valorParaCampo } from '../utils/moeda';
import { normalizarEspacos } from '../utils/strings';
import { criarMapeadorDeErros } from './errosServidor';

/** Os campos têm os nomes do MovimentacaoFinanceiraRequest (membro guarda { id, nome, status? }), na ordem da tela. */
export const CAMPOS_MOVIMENTACAO = Object.freeze(['tipo', 'valor', 'data', 'categoriaId', 'descricao', 'membro']);

export const TAMANHO_DATA_MASCARADA = 10;

/** Valor com vírgula decimal: "1234", "1234,5" ou com pontos de milhar ("1.234,56", como valorParaCampo formata). */
const PADRAO_VALOR_BR = /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,(\d*))?$/;

/**
 * Valores do formulário (sempre texto; data em DD/MM/AAAA, valor em "1.234,56") a partir de um
 * MovimentacaoFinanceiraResponse, ou vazios. Movimentação nova começa com a data de hoje
 * (no fuso da igreja) e sem tipo: receita ou despesa é uma escolha consciente.
 */
export function valoresIniciaisMovimentacao(movimentacao, { hoje = null } = {}) {
  return {
    tipo: movimentacao?.tipo ?? '',
    valor: valorParaCampo(movimentacao?.valor),
    data: formatarData(movimentacao?.data ?? hoje),
    categoriaId: movimentacao?.categoria?.id ?? '',
    descricao: movimentacao?.descricao ?? '',
    membro: movimentacao?.membroId ? { id: movimentacao.membroId, nome: movimentacao.membroNome } : null,
  };
}

/** Máscaras aplicadas na digitação. */
export function formatarCampoMovimentacao(campo, valor) {
  if (campo === 'valor') return mascararValorDigitado(valor, { digitosInteiros: LIMITES_MOVIMENTACAO.digitosInteiros });
  if (campo === 'data') return formatarDataDigitada(valor);
  return valor;
}

/** Ao sair do campo de valor, ele ganha o formato completo: "1234,5" → "1.234,50". Inválido fica como está. */
export function formatarValorAoSair(texto) {
  const centavos = lerCentavosBr(texto);
  return centavos === null ? texto : valorParaCampo(centavosParaValor(centavos));
}

/** Categorias de um tipo, em ordem alfabética (o backend devolve sem ordem). */
export function categoriasDoTipo(categorias, tipo) {
  return (categorias ?? [])
    .filter((categoria) => !tipo || categoria.tipo === tipo)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** A categoria escolhida continua valendo com o tipo novo? (O backend recusa tipo ≠ tipo da categoria.) */
export function categoriaCompativel(categorias, categoriaId, tipo) {
  const categoria = (categorias ?? []).find((c) => c.id === categoriaId);
  return Boolean(categoria) && categoria.tipo === tipo;
}

function validarTipo(tipo) {
  return isTipoMovimentacaoValido(tipo) ? null : 'Escolha se é uma receita ou uma despesa.';
}

/**
 * RN06/RN07: receita e despesa têm sempre valor positivo; o tipo diz se o dinheiro entra ou sai.
 * Mesmos limites do @DecimalMin("0.01") e do @Digits(integer = 10, fraction = 2).
 */
export function validarValor(texto) {
  const valor = String(texto ?? '').trim();
  if (!valor) return 'Informe o valor.';
  if (valor.startsWith('-')) return 'Informe o valor sem sinal de menos: o tipo (receita ou despesa) já diz se o dinheiro entra ou sai.';
  const partes = PADRAO_VALOR_BR.exec(valor);
  if (!partes) return 'Informe um valor válido, ex.: 150,00.';
  if ((partes[1] ?? '').length > LIMITES_MOVIMENTACAO.casasDecimais) return 'Use no máximo 2 casas decimais.';
  const inteiros = valor.split(',')[0].replace(/\./g, '').replace(/^0+(?=\d)/, '');
  if (inteiros.length > LIMITES_MOVIMENTACAO.digitosInteiros) {
    return `Use no máximo ${LIMITES_MOVIMENTACAO.digitosInteiros} dígitos antes da vírgula.`;
  }
  const centavos = lerCentavosBr(valor);
  if (centavos === null) return 'Informe um valor válido, ex.: 150,00.';
  if (centavos <= 0) return 'O valor deve ser maior que zero.';
  return null;
}

function validarData(valor) {
  const texto = valor.trim();
  if (!texto) return 'Informe a data.';
  if (!dataBrParaIso(texto)) return 'Informe uma data válida, no formato DD/MM/AAAA.';
  return null;
}

/** RN10: toda movimentação tem categoria, e do mesmo tipo (receita com categoria de receita). */
function validarCategoria(categoriaId, tipo, categorias) {
  if (!categoriaId) return 'Escolha a categoria.';
  if (categorias && isTipoMovimentacaoValido(tipo) && !categoriaCompativel(categorias, categoriaId, tipo)) {
    return `Escolha uma categoria de ${infoTipoMovimentacao(tipo).rotulo.toLowerCase()}.`;
  }
  return null;
}

function validarDescricao(valor) {
  const descricao = normalizarEspacos(valor);
  if (!descricao) return 'Informe a descrição.';
  if (descricao.length > LIMITES_MOVIMENTACAO.descricao) return `Use no máximo ${LIMITES_MOVIMENTACAO.descricao} caracteres.`;
  return null;
}

/**
 * Devolve { campo: mensagem } só com os campos inválidos. categorias (opcional) permite conferir
 * se a categoria escolhida é do tipo escolhido.
 */
export function validarMovimentacao(valores, { categorias = null } = {}) {
  const erros = {
    tipo: validarTipo(valores.tipo),
    valor: validarValor(valores.valor),
    data: validarData(valores.data),
    categoriaId: validarCategoria(valores.categoriaId, valores.tipo, categorias),
    descricao: validarDescricao(valores.descricao),
  };
  return Object.fromEntries(Object.entries(erros).filter(([, mensagem]) => mensagem));
}

/**
 * Monta o MovimentacaoFinanceiraRequest. valor: número com até 2 casas, calculado dos centavos
 * (nunca negativo: só chega aqui o que passou por validarValor). Membro ausente → null.
 */
export function montarPayloadMovimentacao(valores) {
  const centavos = lerCentavosBr(valores.valor);
  if (centavos === null || centavos <= 0) throw new Error('Valor inválido: valide o formulário antes de montar o payload.');
  return {
    descricao: normalizarEspacos(valores.descricao),
    valor: centavosParaValor(centavos),
    data: dataBrParaIso(valores.data),
    tipo: valores.tipo,
    categoriaId: valores.categoriaId,
    membroId: valores.membro?.id ?? null,
  };
}

/** Mensagem do 404 de PUT/GET quando a própria movimentação não existe mais. */
export const MENSAGEM_MOVIMENTACAO_INEXISTENTE = 'Movimentação financeira não encontrada';

export function isMovimentacaoInexistente(erro) {
  return erro?.status === 404 && erro.message === MENSAGEM_MOVIMENTACAO_INEXISTENTE;
}

const mapearValidacao = criarMapeadorDeErros({
  campoPorMensagem: {
    'A descrição é obrigatória': 'descricao',
    'A descrição deve ter no máximo 255 caracteres': 'descricao',
    'O valor é obrigatório': 'valor',
    'O valor deve ser positivo': 'valor',
    'O valor deve ter até 10 dígitos inteiros e 2 casas decimais': 'valor',
    'A data é obrigatória': 'data',
    'O tipo é obrigatório': 'tipo',
    'A categoria é obrigatória': 'categoriaId',
  },
});

/** Erros do serviço que têm campo: BusinessException (400) e os 404 de categoria e de membro. */
const ERROS_DO_SERVICO = [
  { status: 400, padrao: /^O tipo da movimentação \(\w+\) não é compatível com o tipo da categoria/, campo: 'categoriaId' },
  { status: 404, padrao: /^Categoria financeira não encontrada$/, campo: 'categoriaId' },
  { status: 404, padrao: /^Membro não encontrado$/, campo: 'membro' },
];

/**
 * Erros do servidor → campos do formulário. Provisório: depende do texto exato das mensagens do
 * MovimentacaoFinanceiraRequest e do MovimentacaoFinanceiraService (ver schemas/errosServidor.js).
 */
export function mapearErroDoServidor(erro) {
  const doServico = ERROS_DO_SERVICO.find(({ status, padrao }) => erro.status === status && padrao.test(erro.message ?? ''));
  if (doServico) return { camposErro: { [doServico.campo]: erro.message }, erroGeral: null };
  return mapearValidacao(erro);
}
