import { useEffect, useId, useRef } from 'react';
import { Button } from './Button';
import styles from './Modal.module.css';

export function Modal({ isOpen, title, onClose, size = 'medium', children }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  function handleCancel(event) {
    event.preventDefault();
    onClose();
  }

  return (
    <dialog ref={dialogRef} className={`${styles.dialog} ${styles[size]}`} aria-labelledby={titleId} onCancel={handleCancel}>
      {isOpen && (
        <>
          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <Button variant="ghost" icon="close" iconOnly aria-label="Fechar" onClick={onClose} />
          </header>
          <div className={styles.body}>{children}</div>
        </>
      )}
    </dialog>
  );
}
