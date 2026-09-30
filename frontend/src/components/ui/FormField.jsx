import { cx } from '../../utils/classNames';
import { Icon } from './Icon';
import styles from './FormField.module.css';

/**
 * Moldura comum dos campos: rótulo, dica e erro ligados ao controle por
 * htmlFor / aria-describedby / aria-invalid. O controle é recebido por render prop.
 */
export function FormField({ id, rotulo, obrigatorio = false, dica, erro, className, children }) {
  const idDica = dica ? `${id}-dica` : null;
  const idErro = erro ? `${id}-erro` : null;
  const acessibilidade = {
    id,
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': [idDica, idErro].filter(Boolean).join(' ') || undefined,
    'aria-required': obrigatorio || undefined,
  };

  return (
    <div className={cx(styles.campo, className)}>
      <label htmlFor={id} className={styles.rotulo}>
        {rotulo}
        {obrigatorio && (
          <span className={styles.marcaObrigatorio} aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children(acessibilidade)}
      {dica && (
        <p id={idDica} className={styles.dica}>
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className={styles.erro}>
          <Icon nome="alerta" tamanho={14} />
          {erro}
        </p>
      )}
    </div>
  );
}

export function TextField({ id, rotulo, obrigatorio, dica, erro, className, acao, ...propsDoInput }) {
  return (
    <FormField id={id} rotulo={rotulo} obrigatorio={obrigatorio} dica={dica} erro={erro} className={className}>
      {(acessibilidade) => (
        <div className={styles.controle}>
          <input className={cx(styles.entrada, acao && styles.comAcao)} {...acessibilidade} {...propsDoInput} />
          {acao && <div className={styles.acao}>{acao}</div>}
        </div>
      )}
    </FormField>
  );
}

export function SelectField({ id, rotulo, obrigatorio, dica, erro, className, opcoes, ...propsDoSelect }) {
  return (
    <FormField id={id} rotulo={rotulo} obrigatorio={obrigatorio} dica={dica} erro={erro} className={className}>
      {(acessibilidade) => (
        <select className={styles.entrada} {...acessibilidade} {...propsDoSelect}>
          {opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
}
