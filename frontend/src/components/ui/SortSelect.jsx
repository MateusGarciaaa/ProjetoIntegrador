import { cx } from '../../utils/classNames';
import { DIRECOES, lerSort, ordenacaoParaSort } from '../../utils/ordenacao';
import { SelectField } from './FormField';
import styles from './SortSelect.module.css';

function opcoesDosCampos(campos) {
  return campos.flatMap(({ campo, rotulo }) => [
    { valor: ordenacaoParaSort({ campo, direcao: DIRECOES.ASC }), rotulo: `${rotulo} (A → Z)` },
    { valor: ordenacaoParaSort({ campo, direcao: DIRECOES.DESC }), rotulo: `${rotulo} (Z → A)` },
  ]);
}

/**
 * "Ordenar por" para o modo cartões da Table, que não tem cabeçalhos clicáveis.
 * Some a partir de 720px, onde a tabela já ordena pelo cabeçalho.
 *   campos: [{ campo, rotulo }]; ordenacao: { campo, direcao }; onMudar({ campo, direcao }).
 */
export function SortSelect({ id, campos, ordenacao, onMudar, className }) {
  return (
    <SelectField
      id={id}
      rotulo="Ordenar por"
      className={cx(styles.seletor, className)}
      opcoes={opcoesDosCampos(campos)}
      value={ordenacaoParaSort(ordenacao)}
      onChange={(evento) => onMudar(lerSort(evento.target.value))}
    />
  );
}
