import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useAuth } from '../hooks/useAuth';
import { ROLE_LABELS } from '../constants/roles';
import { NAVIGATION_ITEMS } from '../routes/navigation';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const { user, can, logout } = useAuth();
  const visibleItems = NAVIGATION_ITEMS.filter((item) => can(item.permission));

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <span className={styles.brand}>ChurchHub</span>

        <nav className={styles.nav} aria-label="Menu principal">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.account}>
          <div className={styles.accountInfo}>
            <span className={styles.userName}>{user.name}</span>
            <span className={styles.userRole}>{ROLE_LABELS[user.role] ?? user.role}</span>
          </div>
          <Button variant="ghost" icon="logout" iconOnly aria-label="Sair" title="Sair" onClick={logout} />
        </div>
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
