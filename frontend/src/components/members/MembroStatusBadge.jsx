import { infoStatus } from '../../constants/statusMembro';
import { Badge } from '../ui/Badge';

export function MembroStatusBadge({ status }) {
  const { rotulo, tom } = infoStatus(status);
  return <Badge tom={tom}>{rotulo}</Badge>;
}
