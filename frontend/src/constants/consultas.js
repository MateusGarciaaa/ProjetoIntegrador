/** Valores comuns às consultas de todos os módulos. */

/**
 * Spring Data limita o size a 2000 (spring.data.web.pageable.max-page-size); acima disso, reduz em
 * silêncio. É o tamanho usado quando a tela precisa do período inteiro numa página (calendário) ou
 * página a página até a última (lançamentos do relatório).
 */
export const TAMANHO_MAXIMO_PAGINA = 2000;

/** Espera depois da digitação antes de buscar por nome (listas de membros e de usuários). */
export const ATRASO_BUSCA_MS = 400;

/** Data digitada com máscara: DD/MM/AAAA. */
export const TAMANHO_DATA_DIGITADA = 10;
