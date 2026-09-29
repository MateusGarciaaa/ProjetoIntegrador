import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { MembersPage } from '../pages/members/MembersPage';
import { NotFoundPage } from '../pages/errors/NotFoundPage';
import { PERMISSIONS } from '../constants/permissions';
import { HomeRedirect, RequireAuth, RequireGuest, RequirePermission } from './guards';
import { ROUTE_PATHS } from './routePaths';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RequireGuest />}>
        <Route path={ROUTE_PATHS.LOGIN} element={<LoginPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path={ROUTE_PATHS.HOME} element={<HomeRedirect />} />
          <Route
            path={ROUTE_PATHS.MEMBERS}
            element={
              <RequirePermission permission={PERMISSIONS.MEMBERS_VIEW}>
                <MembersPage />
              </RequirePermission>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
