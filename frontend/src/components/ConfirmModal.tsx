import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Excluir',
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-icon" aria-hidden="true">
          <AlertTriangle size={24} />
        </div>
        <button
          type="button"
          className="icon-button modal-close"
          onClick={onCancel}
          aria-label="Fechar"
        >
          <X size={19} />
        </button>
        <h2 id="confirm-title">{title}</h2>
        <p>{description}</p>
        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="button button-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <span className="spinner spinner-small" />}
            {loading ? 'Excluindo...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
