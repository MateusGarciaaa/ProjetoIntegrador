import { useId } from 'react';
import styles from './Field.module.css';

export function TextField({ label, error, optional = false, id, className = '', ...inputProps }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={`${styles.field} ${className}`}>
      <label htmlFor={inputId} className={styles.label}>
        {label} {optional && <span className={styles.optional}>(opcional)</span>}
      </label>
      <input
        id={inputId}
        className={styles.control}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <span id={errorId} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
