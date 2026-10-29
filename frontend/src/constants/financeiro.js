/** Espelho do enum TipoMovimentacao. */
export const TIPOS_MOVIMENTACAO = Object.freeze({
  RECEITA: 'RECEITA',
  DESPESA: 'DESPESA',
});

/**
 * Como cada tipo aparece na tela. A cor nunca é a única pista (acessibilidade): o tipo
 * sempre vem com ícone e texto, e o valor com o sinal "+" ou "−" escrito.
 */
export const OPCOES_TIPO_MOVIMENTACAO = Object.freeze([
  { valor: TIPOS_MOVIMENTACAO.RECEITA, rotulo: 'Receita', plural: 'Receitas', icone: 'entrada', sinal: '+', tom: 'receita' },
  { valor: TIPOS_MOVIMENTACAO.DESPESA, rotulo: 'Despesa', plural: 'Despesas', icone: 'saida', sinal: '−', tom: 'despesa' },
]);

export function infoTipoMovimentacao(tipo) {
  return OPCOES_TIPO_MOVIMENTACAO.find((opcao) => opcao.valor === tipo) ?? null;
}

export function isTipoMovimentacaoValido(tipo) {
  return OPCOES_TIPO_MOVIMENTACAO.some((opcao) => opcao.valor === tipo);
}

/**
 * Limites do MovimentacaoFinanceiraRequest e do CategoriaFinanceiraRequest
 * (V5 e V6: descricao VARCHAR(255), valor NUMERIC(12,2) com @Digits(integer = 10, fraction = 2),
 * nome da categoria VARCHAR(100)).
 */
export const LIMITES_MOVIMENTACAO = Object.freeze({
  descricao: 255,
  digitosInteiros: 10,
  casasDecimais: 2,
});

export const LIMITE_NOME_CATEGORIA = 100;

export const TAMANHO_PAGINA_MOVIMENTACOES = 10;

/**
 * Fluxo de caixa e relatório trazem o período inteiro numa só página (o máximo do Spring, como o
 * calendário de Eventos): o backend não tem série por dia/mês nem totais por categoria.
 */
export const TAMANHO_PAGINA_PERIODO = 2000;

/**
 * Mais recentes primeiro. O @PageableDefault do controller é só "data" (sem desempate);
 * o id explícito deixa a ordem estável entre lançamentos do mesmo dia.
 */
export const ORDENACAO_MOVIMENTACOES = Object.freeze(['data,desc', 'id,desc']);

/** Até este número de dias o gráfico do fluxo de caixa é diário; acima, mensal. */
export const LIMITE_DIAS_GRAFICO_DIARIO = 62;

export const AGRUPAMENTOS = Object.freeze({ DIA: 'dia', MES: 'mes' });
