import { cx } from '../../utils/classNames';
import { Icon } from './Icon';
import { Spinner } from './Spinner';
import styles from './Button.module.css';

function bloquearClique(evento) {
  evento.preventDefault();
}

/**
 * variante: primario | secundario | fantasma | perigo | perigoSuave
 * Com carregando, o botão usa aria-disabled em vez de disabled: um botão desabilitado
 * perde o foco para o <body>, o que tiraria o foco de dentro de uma modal.
 */
export function Button({
  variante = 'primario',
  pequeno = false,
  blocoInteiro = false,
  carregando = false,
  icone,
  type = 'button',
  disabled,
  className,
  onClick,
  children,
  ...resto
}) {
  return (
    <button
      type={type}
      className={cx(styles.botao, styles[variante], pequeno && styles.pequeno, blocoInteiro && styles.blocoInteiro, className)}
      disabled={disabled}
      aria-disabled={carregando || undefined}
      aria-busy={carregando || undefined}
      onClick={carregando ? bloquearClique : onClick}
      {...resto}
    >
      {carregando ? <Spinner /> : icone && <Icon nome={icone} tamanho={18} />}
      {children}
    </button>
  );
}

/** Botão só com ícone: o rótulo acessível é obrigatório. */
export function IconButton({ icone, rotulo, variante = 'fantasma', pequeno = false, className, type = 'button', ...resto }) {
  return (
    <button
      type={type}
      className={cx(styles.botao, styles[variante], styles.apenasIcone, pequeno && styles.pequeno, className)}
      aria-label={rotulo}
      title={rotulo}
      {...resto}
    >
      <Icon nome={icone} tamanho={18} />
    </button>
  );
}
