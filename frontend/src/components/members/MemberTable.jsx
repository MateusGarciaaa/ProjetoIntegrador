import { Button } from '../ui/Button';
import { MemberStatusBadge } from './MemberStatusBadge';
import { formatIsoDate, formatPhone } from '../../utils/formatters';
import styles from './MemberTable.module.css';

const EMPTY_CELL = '—';

export function MemberTable({ members, canEdit, canDelete, onEdit, onDelete }) {
  const hasActions = canEdit || canDelete;

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Telefone</th>
            <th scope="col">Nascimento</th>
            <th scope="col">Status</th>
            {hasActions && <th scope="col" className={styles.actionsHeader}>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td>
                <span className={styles.name}>{member.name}</span>
                <span className={styles.email}>{member.email}</span>
              </td>
              <td>{formatPhone(member.phone) || EMPTY_CELL}</td>
              <td>{formatIsoDate(member.birthDate) || EMPTY_CELL}</td>
              <td>
                <MemberStatusBadge status={member.status} />
              </td>
              {hasActions && (
                <td className={styles.actions}>
                  {canEdit && (
                    <Button variant="ghost" icon="edit" iconOnly aria-label={`Editar ${member.name}`} onClick={() => onEdit(member)} />
                  )}
                  {canDelete && (
                    <Button variant="ghost" icon="trash" iconOnly aria-label={`Excluir ${member.name}`} onClick={() => onDelete(member)} />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
