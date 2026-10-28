/** Tamanhos das colunas em V3__create_membros.sql, repetidos nos @Size do MembroRequest. */
export const LIMITES_MEMBRO = Object.freeze({
  nome: 150,
  cpf: 11,
  email: 150,
  telefone: 20,
  endereco: 255,
});

export const TAMANHO_PAGINA_MEMBROS = 10;

/**
 * Colunas que a lista deixa ordenar. Precisam ser campos reais da entidade Membro
 * (um campo inexistente gera 400); a URL só aceita estes, o resto volta ao padrão.
 */
export const CAMPOS_ORDENAVEIS_MEMBROS = Object.freeze(['nome', 'email', 'telefone', 'status']);

export const ORDENACAO_PADRAO_MEMBROS = Object.freeze({ campo: 'nome', direcao: 'asc' });

/**
 * Desempate da ordenação: com muitos valores iguais (ex.: status), o Postgres não garante
 * a ordem entre eles e a paginação poderia repetir ou pular membros.
 */
export const DESEMPATE_MEMBROS = Object.freeze(['nome,asc', 'id,asc']);

export const ATRASO_BUSCA_MS = 400;

/** Limite do GET /members/lookup (MembroService.TAMANHO_MAXIMO_PAGINA_RESUMO); acima disso o backend reduz. */
export const TAMANHO_MAXIMO_BUSCA_MEMBROS = 20;
