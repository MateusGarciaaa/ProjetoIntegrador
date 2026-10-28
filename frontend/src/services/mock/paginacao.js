import { TAMANHO_MAXIMO_PAGINA } from '../http/pagina';

/** Padrão do @PageableDefault dos controllers (size = 20). */
const TAMANHO_PADRAO = 20;

function inteiroNaoNegativo(valor, padrao) {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero >= 0 ? numero : padrao;
}

function lerCriterio(texto) {
  const [campo, direcao = 'asc'] = String(texto).split(',');
  return { campo, direcao: direcao.toLowerCase() === 'desc' ? 'DESC' : 'ASC' };
}

/**
 * Lê page/size/sort como o PageableHandlerMethodArgumentResolver: size limitado a 2000, sem erro;
 * sort pode se repetir (sort=a&sort=b) e cada critério desempata o anterior.
 * campo/direcao repetem o 1º critério, para quem só usa um.
 */
export function lerPageable(params, ordenacaoPadrao) {
  const textos = [params.sort ?? ordenacaoPadrao].flat();
  const criterios = textos.map(lerCriterio);
  return {
    pagina: inteiroNaoNegativo(params.page, 0),
    tamanho: Math.min(Math.max(inteiroNaoNegativo(params.size, TAMANHO_PADRAO), 1), TAMANHO_MAXIMO_PAGINA),
    criterios,
    ...criterios[0],
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
