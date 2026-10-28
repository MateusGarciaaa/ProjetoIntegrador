import { Badge } from '../ui/Badge';

/** "Encerrado" segue o critério do backend (RN09): o horário de início já passou. */
export function EventoSituacaoBadge({ encerrado }) {
  return encerrado ? <Badge tom="neutro">Encerrado</Badge> : <Badge tom="info">Agendado</Badge>;
}
