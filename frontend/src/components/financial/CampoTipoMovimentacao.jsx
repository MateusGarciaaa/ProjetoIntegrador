import { OPCOES_TIPO_MOVIMENTACAO } from '../../constants/financeiro';
import { cx } from '../../utils/classNames';
import { Icon } from '../ui/Icon';
import styles from './CampoTipoMovimentacao.module.css';

/**
 * Receita ou despesa: dois rádios grandes com ícone e texto. O tipo diz se o dinheiro entra ou sai;
 * o valor é sempre positivo (RN06/RN07). Erro ligado ao grupo por aria-describedby.
 */
export function CampoTipoMovimentacao({ id, valor, erro, onAlterar, className }) {
  const idErro = `${id}-erro`;
  return (
    <fieldset
      className={cx(styles.grupo, className)}
      aria-describedby={erro ? idErro : undefined}
      aria-invalid={erro ? true : undefined}
    >
      <legend className={styles.rotulo}>
        Tipo
        <span className={styles.obrigatorio} aria-hidden="true">
          *
        </span>
      </legend>
      <div className={styles.opcoes}>
        {OPCOES_TIPO_MOVIMENTACAO.map((opcao, indice) => (
          <label key={opcao.valor} className={cx(styles.opcao, styles[opcao.tom], valor === opcao.valor && styles.marcada)}>
            <input
              id={indice === 0 ? id : undefined}
              type="radio"
              name="tipo"
              value={opcao.valor}
              checked={valor === opcao.valor}
              onChange={() => onAlterar(opcao.valor)}
              required
            />
            <Icon nome={opcao.icone} tamanho={18} />
            <span>
              <span className={styles.nome}>{opcao.rotulo}</span>
              <span className={styles.explicacao}>{opcao.valor === 'RECEITA' ? 'Dinheiro que entra' : 'Dinheiro que sai'}</span>
            </span>
          </label>
        ))}
      </div>
      {erro && (
        <p id={idErro} className={styles.erro}>
          <Icon nome="alerta" tamanho={14} />
          {erro}
        </p>
      )}
    </fieldset>
  );
}
