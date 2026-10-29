import { infoTipoMovimentacao, isTipoMovimentacaoValido, LIMITE_NOME_CATEGORIA } from '../constants/financeiro';
import { normalizarEspacos } from '../utils/strings';
import { criarMapeadorDeErros } from './errosServidor';

export const CAMPOS_CATEGORIA = Object.freeze(['nome', 'tipo']);

export function valoresIniciaisCategoria({ tipo = '' } = {}) {
  return { nome: '', tipo };
}

function chaveDoNome(nome) {
  return normalizarEspacos(nome).toLocaleLowerCase('pt-BR');
}

/**
 * Valida o CategoriaFinanceiraRequest. existentes (opcional): categorias já carregadas. O backend só
 * recusa nome idêntico (409); aqui "dízimos" e "Dízimos" também contam como a mesma categoria.
 */
export function validarCategoria(valores, { existentes = [] } = {}) {
  const erros = {};
  const nome = normalizarEspacos(valores.nome);
  if (!nome) erros.nome = 'Informe o nome da categoria.';
  else if (nome.length > LIMITE_NOME_CATEGORIA) erros.nome = `Use no máximo ${LIMITE_NOME_CATEGORIA} caracteres.`;
  if (!isTipoMovimentacaoValido(valores.tipo)) erros.tipo = 'Escolha se a categoria é de receita ou de despesa.';

  if (!erros.nome && !erros.tipo) {
    const repetida = existentes.find((c) => c.tipo === valores.tipo && chaveDoNome(c.nome) === chaveDoNome(nome));
    if (repetida) erros.nome = `Já existe a categoria "${repetida.nome}" para ${infoTipoMovimentacao(valores.tipo).plural.toLowerCase()}.`;
  }
  return erros;
}

export function montarPayloadCategoria(valores) {
  return { nome: normalizarEspacos(valores.nome), tipo: valores.tipo };
}

/** Provisório: depende do texto das mensagens do CategoriaFinanceiraRequest e do 409 do serviço. */
export const mapearErroCategoria = criarMapeadorDeErros({
  campoPorMensagem: {
    'O nome da categoria é obrigatório': 'nome',
    'O nome da categoria deve ter no máximo 100 caracteres': 'nome',
    'O tipo da categoria é obrigatório': 'tipo',
  },
  campoPorConflito: [{ padrao: /categoria/i, campo: 'nome' }],
});
