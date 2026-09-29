import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ForbiddenPage } from '../pages/errors/ForbiddenPage';
import { NAVIGATION_ITEMS } from './navigation';
import { ROUTE_PATHS } from './routePaths';

export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.LOGIN} replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export function RequireGuest() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to={ROUTE_PATHS.HOME} replace /> : <Outlet />;
}

export function RequirePermission({ permission, children }) {
  const { can } = useAuth();
  return can(permission) ? children : <ForbiddenPage />;
}

export function HomeRedirect() {
  const { can } = useAuth();
  const firstAllowedItem = NAVIGATION_ITEMS.find((item) => can(item.permission));
  return firstAllowedItem ? <Navigate to={firstAllowedItem.path} replace /> : <ForbiddenPage />;
}
