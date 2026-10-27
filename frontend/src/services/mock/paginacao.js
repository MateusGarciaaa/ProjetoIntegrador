import { TAMANHO_MAXIMO_PAGINA } from '../http/pagina';

/** Padrão do @PageableDefault dos controllers (size = 20). */
const TAMANHO_PADRAO = 20;

function inteiroNaoNegativo(valor, padrao) {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero >= 0 ? numero : padrao;
}

/** Lê page/size/sort como o PageableHandlerMethodArgumentResolver: size limitado a 2000, sem erro. */
export function lerPageable(params, ordenacaoPadrao) {
  const primeira = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const [campo, direcao = 'asc'] = String(primeira ?? ordenacaoPadrao).split(',');
  return {
    pagina: inteiroNaoNegativo(params.page, 0),
    tamanho: Math.min(Math.max(inteiroNaoNegativo(params.size, TAMANHO_PADRAO), 1), TAMANHO_MAXIMO_PAGINA),
    campo,
    direcao: direcao.toLowerCase() === 'desc' ? 'DESC' : 'ASC',
  };
}

function sortJson(ordenada) {
  return { empty: !ordenada, sorted: ordenada, unsorted: !ordenada };
}

/**
 * Mesmo JSON que o backend real devolve: PageImpl serializado no modo DIRECT
 * (padrão do Spring Boot 4.1, sem @EnableSpringDataWebSupport no projeto).
 */
export function paginaSpring(todos, { pagina, tamanho, ordenada = true }) {
  const content = todos.slice(pagina * tamanho, pagina * tamanho + tamanho);
  const totalPages = Math.ceil(todos.length / tamanho);
  return {
    content,
    pageable: {
      pageNumber: pagina,
      pageSize: tamanho,
      sort: sortJson(ordenada),
      offset: pagina * tamanho,
      paged: true,
      unpaged: false,
    },
    last: pagina >= totalPages - 1,
    totalElements: todos.length,
    totalPages,
    size: tamanho,
    number: pagina,
    sort: sortJson(ordenada),
    first: pagina === 0,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}
