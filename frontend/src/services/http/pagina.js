import { ApiError, MENSAGENS_ERRO, TIPOS_ERRO } from './apiError';

/** Spring Data limita o size a 2000 (spring.data.web.pageable.max-page-size); acima disso, reduz em silêncio. */
export const TAMANHO_MAXIMO_PAGINA = 2000;

function inteiroOu(valor, padrao) {
  return Number.isInteger(valor) && valor >= 0 ? valor : padrao;
}

/**
 * O backend (Spring Boot 4.1, sem configuração própria) usa o modo padrão DIRECT:
 * o PageImpl serializado como está —
 *   { content, pageable, totalElements, totalPages, last, size, number, sort, numberOfElements, first, empty }
 * O modo VIA_DTO ({ content, page: { size, number, totalElements, totalPages } }) também é
 * aceito porque fixar o formato é uma pendência do backend (docs/frontend-integracao.md).
 * O app só enxerga o formato abaixo, com os nomes do Spring.
 */
export function normalizarPagina(bruta) {
  if (!bruta || typeof bruta !== 'object' || !Array.isArray(bruta.content)) {
    throw new ApiError({ tipo: TIPOS_ERRO.RESPOSTA_INVALIDA, message: MENSAGENS_ERRO.RESPOSTA_INVALIDA });
  }

  const meta = bruta.page && typeof bruta.page === 'object' ? bruta.page : bruta;
  const { content } = bruta;
  const size = inteiroOu(meta.size, content.length);
  const totalElements = inteiroOu(meta.totalElements, content.length);
  const totalPages = inteiroOu(meta.totalPages, size > 0 ? Math.ceil(totalElements / size) : 0);

  return {
    content,
    number: inteiroOu(meta.number, 0),
    size,
    totalElements,
    totalPages,
  };
}

/** Faixa exibida em "Mostrando X–Y de Z". */
export function faixaDaPagina({ content, number, size, totalElements }) {
  if (totalElements === 0 || content.length === 0) {
    return { inicio: 0, fim: 0, total: totalElements };
  }
  const inicio = number * size + 1;
  return { inicio, fim: inicio + content.length - 1, total: totalElements };
}

function isFiltroPreenchido(valor) {
  return valor !== undefined && valor !== null && String(valor).trim() !== '';
}

function filtrosPreenchidos(filtros) {
  return Object.fromEntries(
    Object.entries(filtros)
      .filter(([, valor]) => isFiltroPreenchido(valor))
      .map(([nome, valor]) => [nome, typeof valor === 'string' ? valor.trim() : valor]),
  );
}

/**
 * Query string do Pageable (page base 0, size, sort "campo,asc|desc") mais os filtros
 * da rota. Filtros vazios não são enviados: o backend os trataria como o texto "".
 * `ordenacao` pode ser uma lista (critérios de desempate): vira sort=a&sort=b.
 */
export function montarParametrosPagina({ pagina = 0, tamanho, ordenacao, filtros = {} } = {}) {
  const parametros = { ...filtrosPreenchidos(filtros), page: Math.max(0, Number.parseInt(pagina, 10) || 0) };
  if (tamanho !== undefined) parametros.size = Math.min(Math.max(1, tamanho), TAMANHO_MAXIMO_PAGINA);
  const criterios = [ordenacao].flat().filter(Boolean);
  if (criterios.length) parametros.sort = criterios.length === 1 ? criterios[0] : criterios;
  return parametros;
}
