import { cx } from '../../utils/classNames';
import { ariaSort, DIRECOES } from '../../utils/ordenacao';
import { Icon } from './Icon';
import styles from './Table.module.css';

function iconeDaOrdenacao(ordenacao, chave) {
  if (ordenacao?.campo !== chave) return 'ordenar';
  return ordenacao.direcao === DIRECOES.DESC ? 'decrescente' : 'crescente';
}

/** Cabeçalho clicável de coluna ordenável; o estado vai no aria-sort do <th>. */
function CabecalhoOrdenavel({ coluna, ordenacao, onOrdenar }) {
  const ativa = ordenacao?.campo === coluna.chave;
  return (
    <button type="button" className={cx(styles.ordenar, ativa && styles.ordenarAtivo)} onClick={() => onOrdenar(coluna.chave)}>
      {coluna.rotulo}
      <Icon nome={iconeDaOrdenacao(ordenacao, coluna.chave)} tamanho={14} />
    </button>
  );
}

/**
 * Tabela a partir de 720px; abaixo disso, a mesma lista vira cartões (alternância só por CSS).
 *   colunas: [{ chave, rotulo, renderizar(item), principal?, destaque?, ordenavel?, className? }]
 *     principal → cabeçalho da linha (<th scope="row">) e título do cartão;
 *     destaque  → no cartão, fica ao lado do título (ex.: status);
 *     ordenavel → com onOrdenar, o cabeçalho vira botão (a chave é o campo do sort).
 *   ordenacao: { campo, direcao } atual; onOrdenar(chave) ao clicar num cabeçalho ordenável.
 *   acoes(item): botões da linha; sem essa função, a coluna de ações não existe.
 * Os cartões não têm cabeçalho: para ordenar em tela pequena, use o SortSelect.
 */
export function Table({ legenda, colunas, itens, chaveDoItem = (item) => item.id, acoes, ordenacao, onOrdenar }) {
  const principal = colunas.find((coluna) => coluna.principal);
  const destaques = colunas.filter((coluna) => coluna.destaque);
  const dadosDoCartao = colunas.filter((coluna) => !coluna.principal && !coluna.destaque);

  return (
    <>
      <table className={styles.tabela}>
        <caption className="sr-only">{legenda}</caption>
        <thead>
          <tr>
            {colunas.map((coluna) => {
              const ordenavel = coluna.ordenavel && onOrdenar;
              return (
                <th key={coluna.chave} scope="col" aria-sort={ordenavel ? ariaSort(ordenacao, coluna.chave) : undefined}>
                  {ordenavel ? <CabecalhoOrdenavel coluna={coluna} ordenacao={ordenacao} onOrdenar={onOrdenar} /> : coluna.rotulo}
                </th>
              );
            })}
            {acoes && (
              <th scope="col" className={styles.colunaAcoes}>
                <span className="sr-only">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={chaveDoItem(item)}>
              {colunas.map((coluna) =>
                coluna.principal ? (
                  <th key={coluna.chave} scope="row" className={cx(styles.principal, coluna.className)}>
                    {coluna.renderizar(item)}
                  </th>
                ) : (
                  <td key={coluna.chave} className={coluna.className}>
                    {coluna.renderizar(item)}
                  </td>
                ),
              )}
              {acoes && (
                <td className={styles.colunaAcoes}>
                  <div className={styles.acoes}>{acoes(item)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className={styles.cartoes} aria-label={legenda}>
        {itens.map((item) => (
          <li key={chaveDoItem(item)} className={styles.cartao}>
            <div className={styles.cartaoTopo}>
              {principal && <span className={styles.principal}>{principal.renderizar(item)}</span>}
              {destaques.map((coluna) => (
                <span key={coluna.chave}>{coluna.renderizar(item)}</span>
              ))}
            </div>
            {dadosDoCartao.length > 0 && (
              <div className={styles.cartaoDados}>
                {dadosDoCartao.map((coluna) => (
                  <span key={coluna.chave} className={coluna.className}>
                    {coluna.renderizar(item)}
                  </span>
                ))}
              </div>
            )}
            {acoes && <div className={styles.cartaoAcoes}>{acoes(item)}</div>}
          </li>
        ))}
      </ul>
    </>
  );
}
