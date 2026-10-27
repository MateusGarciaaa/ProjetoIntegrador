/** Tamanhos das colunas em V3__create_membros.sql, repetidos nos @Size do MembroRequest. */
export const LIMITES_MEMBRO = Object.freeze({
  nome: 150,
  cpf: 11,
  email: 150,
  telefone: 20,
  endereco: 255,
});

export const TAMANHO_PAGINA_MEMBROS = 10;

/** Precisa ser um campo real da entidade Membro; um campo inexistente gera 400. */
export const ORDENACAO_MEMBROS = 'nome,asc';

export const ATRASO_BUSCA_MS = 400;

/** Limite do GET /members/lookup (MembroService.TAMANHO_MAXIMO_PAGINA_RESUMO); acima disso o backend reduz. */
export const TAMANHO_MAXIMO_BUSCA_MEMBROS = 20;
