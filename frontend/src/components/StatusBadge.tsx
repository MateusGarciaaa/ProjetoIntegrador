import type { MemberStatus } from '../types/member'

const statusLabels: Record<MemberStatus, string> = {
  ATIVO: 'Ativo',
  AFASTADO: 'Afastado',
  VISITANTE: 'Visitante',
}

export function StatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <span className="status-dot" />
      {statusLabels[status]}
    </span>
  )
}
