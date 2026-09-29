import { useId } from 'react';
import styles from './Field.module.css';

export function SelectField({ label, error, options, className = '', ...selectProps }) {
  const selectId = useId();
  const errorId = `${selectId}-error`;

  return (
    <div className={`${styles.field} ${className}`}>
      <label htmlFor={selectId} className={styles.label}>
        {label}
      </label>
      <select
        id={selectId}
        className={styles.control}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={errorId} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
