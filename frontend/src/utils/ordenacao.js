export const DIRECOES = Object.freeze({ ASC: 'asc', DESC: 'desc' });

/** Clique no cabeçalho: na mesma coluna inverte a direção; em outra, começa crescente. */
export function alternarOrdenacao(atual, campo) {
  if (atual?.campo === campo) {
    return { campo, direcao: atual.direcao === DIRECOES.ASC ? DIRECOES.DESC : DIRECOES.ASC };
  }
  return { campo, direcao: DIRECOES.ASC };
}

/** { campo, direcao } → "campo,direcao" (formato do parâmetro sort do Spring). */
export function ordenacaoParaSort({ campo, direcao }) {
  return `${campo},${direcao}`;
}

/** "campo,direcao" → { campo, direcao }, ou null se o texto não tiver esse formato. */
export function lerSort(texto) {
  const [campo, direcao = DIRECOES.ASC, ...sobra] = String(texto ?? '').split(',');
  const direcaoNormalizada = direcao.toLowerCase();
  if (!campo || sobra.length || !Object.values(DIRECOES).includes(direcaoNormalizada)) return null;
  return { campo, direcao: direcaoNormalizada };
}

/** Valor do aria-sort de um cabeçalho de coluna. */
export function ariaSort(ordenacao, campo) {
  if (ordenacao?.campo !== campo) return 'none';
  return ordenacao.direcao === DIRECOES.DESC ? 'descending' : 'ascending';
}
