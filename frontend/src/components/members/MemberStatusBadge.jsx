import { MEMBER_STATUS_LABELS } from '../../constants/memberStatus';
import styles from './MemberStatusBadge.module.css';

export function MemberStatusBadge({ status }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{MEMBER_STATUS_LABELS[status] ?? status}</span>;
}
