/** Tamanhos das colunas em V3__create_membros.sql. Passar disso gera erro 500 no backend. */
export const LIMITES_MEMBRO = Object.freeze({
  nome: 150,
  cpf: 11,
  email: 150,
  telefone: 20,
  endereco: 255,
});

export const TAMANHO_PAGINA_MEMBROS = 10;

/** Precisa ser um campo real da entidade Membro; um campo inexistente gera 500. */
export const ORDENACAO_MEMBROS = 'nome,asc';

export const ATRASO_BUSCA_MS = 400;
