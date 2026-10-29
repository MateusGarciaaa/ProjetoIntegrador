import { useId, useState } from 'react';
import { AGRUPAMENTOS } from '../../constants/financeiro';
import { escalaDoGrafico } from '../../utils/fluxoDeCaixa';
import { formatarData, formatarMesAno } from '../../utils/datas';
import { centavosParaValor, formatarMoeda } from '../../utils/moeda';
import styles from './GraficoFluxoCaixa.module.css';

const LARGURA = 720;
const ALTURA = 260;
const MARGEM = { topo: 12, direita: 8, base: 28, esquerda: 84 };
const AREA_X = LARGURA - MARGEM.esquerda - MARGEM.direita;
const AREA_Y = ALTURA - MARGEM.topo - MARGEM.base;
const BASE = MARGEM.topo + AREA_Y;
const LARGURA_MAXIMA_BARRA = 18;
const ESPACO_ENTRE_BARRAS = 2;
const RAIO = 4;
const MAXIMO_ROTULOS_X = 12;

function reais(centavos) {
  return formatarMoeda(centavosParaValor(centavos));
}

/** "2026-10-05" → "5"; "2026-10" → "out/26". */
function rotuloCurto(chave, agrupamento) {
  if (agrupamento === AGRUPAMENTOS.MES) return `${formatarMesAno(chave).slice(0, 3)}/${chave.slice(2, 4)}`;
  return String(Number(chave.slice(8)));
}

function rotuloCompleto(chave, agrupamento) {
  return agrupamento === AGRUPAMENTOS.MES ? formatarMesAno(chave) : formatarData(chave);
}

/** Barra com as pontas de cima arredondadas e a base reta, apoiada no eixo. */
function caminhoDaBarra(x, largura, altura) {
  if (altura <= 0) return '';
  const r = Math.min(RAIO, largura / 2, altura);
  const topo = BASE - altura;
  return `M${x},${BASE}V${topo + r}Q${x},${topo} ${x + r},${topo}H${x + largura - r}Q${x + largura},${topo} ${x + largura},${topo + r}V${BASE}Z`;
}

function Tooltip({ ponto, agrupamento, esquerdaPct }) {
  return (
    <div className={styles.tooltip} style={{ left: `${esquerdaPct}%` }} role="presentation">
      <p className={styles.tooltipTitulo}>{rotuloCompleto(ponto.chave, agrupamento)}</p>
      <p>
        <span className={styles.marcaReceita} aria-hidden="true" /> Receitas: <strong>{reais(ponto.receitas)}</strong>
      </p>
      <p>
        <span className={styles.marcaDespesa} aria-hidden="true" /> Despesas: <strong>{reais(ponto.despesas)}</strong>
      </p>
      <p>
        Saldo: <strong>{reais(ponto.saldo)}</strong>
      </p>
    </div>
  );
}

/**
 * Receitas × despesas por dia ou por mês (barras lado a lado, um só eixo em reais). Passar o mouse
 * sobre um dia mostra os valores; a mesma série está na tabela logo abaixo, para leitor de tela,
 * teclado e impressão. Identidade das séries por legenda + cor validada para daltonismo.
 *   serie: [{ chave, receitas, despesas, saldo }] em centavos (utils/fluxoDeCaixa.serieDoFluxoDeCaixa).
 */
export function GraficoFluxoCaixa({ serie, agrupamento }) {
  const idTabela = useId();
  const [ativo, setAtivo] = useState(null);
  const maior = serie.reduce((max, p) => Math.max(max, p.receitas, p.despesas), 0);
  const { maximo, marcas } = escalaDoGrafico(maior);
  const larguraGrupo = AREA_X / Math.max(serie.length, 1);
  const larguraBarra = Math.max(2, Math.min(LARGURA_MAXIMA_BARRA, (larguraGrupo * 0.8 - ESPACO_ENTRE_BARRAS) / 2));
  const passoRotulo = Math.ceil(serie.length / MAXIMO_ROTULOS_X);
  const altura = (centavos) => (centavos / maximo) * AREA_Y;
  const comMovimento = serie.filter((p) => p.receitas || p.despesas);
  const unidade = agrupamento === AGRUPAMENTOS.MES ? 'mês' : 'dia';

  return (
    <figure className={styles.figura}>
      <figcaption className={styles.cabecalho}>
        <span className={styles.titulo}>Receitas e despesas por {unidade}</span>
        <span className={styles.legenda} aria-hidden="true">
          <span>
            <span className={styles.marcaReceita} /> Receitas
          </span>
          <span>
            <span className={styles.marcaDespesa} /> Despesas
          </span>
        </span>
      </figcaption>

      <div className={styles.area} onMouseLeave={() => setAtivo(null)}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${LARGURA} ${ALTURA}`}
          role="img"
          aria-label={`Gráfico de barras com receitas e despesas por ${unidade}. Os valores estão na tabela a seguir.`}
          aria-describedby={idTabela}
        >
          {marcas.map((marca) => {
            const y = BASE - altura(marca);
            return (
              <g key={marca}>
                <line className={marca === 0 ? styles.eixo : styles.grade} x1={MARGEM.esquerda} x2={LARGURA - MARGEM.direita} y1={y} y2={y} />
                <text className={styles.rotuloEixo} x={MARGEM.esquerda - 8} y={y} dy="0.32em" textAnchor="end">
                  {reais(marca)}
                </text>
              </g>
            );
          })}

          {serie.map((ponto, indice) => {
            const xGrupo = MARGEM.esquerda + indice * larguraGrupo;
            const xReceita = xGrupo + larguraGrupo / 2 - larguraBarra - ESPACO_ENTRE_BARRAS / 2;
            const xDespesa = xGrupo + larguraGrupo / 2 + ESPACO_ENTRE_BARRAS / 2;
            return (
              <g key={ponto.chave} className={ativo === indice ? styles.grupoAtivo : undefined}>
                <path className={styles.barraReceita} d={caminhoDaBarra(xReceita, larguraBarra, altura(ponto.receitas))} />
                <path className={styles.barraDespesa} d={caminhoDaBarra(xDespesa, larguraBarra, altura(ponto.despesas))} />
                {indice % passoRotulo === 0 && (
                  <text className={styles.rotuloEixo} x={xGrupo + larguraGrupo / 2} y={BASE + 18} textAnchor="middle">
                    {rotuloCurto(ponto.chave, agrupamento)}
                  </text>
                )}
                {/* Alvo do mouse maior que as barras: a coluna inteira do dia. */}
                <rect
                  className={styles.alvo}
                  x={xGrupo}
                  y={MARGEM.topo}
                  width={larguraGrupo}
                  height={AREA_Y}
                  onMouseEnter={() => setAtivo(indice)}
                />
              </g>
            );
          })}
        </svg>
        {ativo !== null && serie[ativo] && (
          <Tooltip
            ponto={serie[ativo]}
            agrupamento={agrupamento}
            esquerdaPct={((MARGEM.esquerda + (ativo + 0.5) * larguraGrupo) / LARGURA) * 100}
          />
        )}
      </div>

      <details className={styles.dados} id={idTabela}>
        <summary>Ver os valores em tabela</summary>
        {comMovimento.length === 0 ? (
          <p className={styles.vazio}>Nenhuma movimentação no período.</p>
        ) : (
          <table className={styles.tabela}>
            <caption className="sr-only">Receitas, despesas e saldo por {unidade} (só os que tiveram movimentação)</caption>
            <thead>
              <tr>
                <th scope="col">{agrupamento === AGRUPAMENTOS.MES ? 'Mês' : 'Dia'}</th>
                <th scope="col">Receitas</th>
                <th scope="col">Despesas</th>
                <th scope="col">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {comMovimento.map((ponto) => (
                <tr key={ponto.chave}>
                  <th scope="row">{rotuloCompleto(ponto.chave, agrupamento)}</th>
                  <td>{reais(ponto.receitas)}</td>
                  <td>{reais(ponto.despesas)}</td>
                  <td>{reais(ponto.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>
    </figure>
  );
}
