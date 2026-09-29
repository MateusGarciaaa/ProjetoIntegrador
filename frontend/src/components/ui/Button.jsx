import { Icon } from './Icon';
import { Spinner } from './Spinner';
import styles from './Button.module.css';

export function Button({
  variant = 'primary',
  icon,
  isLoading = false,
  iconOnly = false,
  type = 'button',
  disabled,
  className = '',
  children,
  ...rest
}) {
  const classNames = [styles.button, styles[variant], iconOnly && styles.iconOnly, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classNames} disabled={disabled || isLoading} aria-busy={isLoading} {...rest}>
      {isLoading ? <Spinner /> : icon && <Icon name={icon} />}
      {!iconOnly && children}
    </button>
  );
}
