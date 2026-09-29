import { Button } from './Button';
import { Modal } from './Modal';
import styles from './ConfirmDialog.module.css';

export function ConfirmDialog({ isOpen, title, message, confirmLabel, isConfirming, onConfirm, onCancel }) {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onCancel} size="small">
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={isConfirming}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isConfirming}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
