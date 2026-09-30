import { ApiError, MENSAGENS_ERRO, TIPOS_ERRO } from './apiError';

function inteiroOu(valor, padrao) {
  return Number.isInteger(valor) && valor >= 0 ? valor : padrao;
}

/**
 * O Spring Data pode serializar a página de dois jeitos, conforme a versão e a
 * configuração (PageSerializationMode):
 *   DIRECT:  { content, totalElements, totalPages, number, size, ... }
 *   VIA_DTO: { content, page: { size, number, totalElements, totalPages } }
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
