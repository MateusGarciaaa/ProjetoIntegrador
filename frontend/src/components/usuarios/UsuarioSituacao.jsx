import { Badge } from '../ui/Badge';
import styles from './UsuariosLista.module.css';

/** Ativo/Inativo e, enquanto a pessoa não definiu a senha pelo link, "Convite pendente". */
export function UsuarioSituacao({ usuario }) {
  return (
    <span className={styles.situacao}>
      <Badge tom={usuario.ativo ? 'sucesso' : 'neutro'}>{usuario.ativo ? 'Ativo' : 'Inativo'}</Badge>
      {usuario.convitePendente && <Badge tom="aviso">Convite pendente</Badge>}
    </span>
  );
}
