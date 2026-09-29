import { PERMISSIONS } from '../constants/permissions';
import { ROUTE_PATHS } from './routePaths';

export const NAVIGATION_ITEMS = Object.freeze([
  { label: 'Membros', path: ROUTE_PATHS.MEMBERS, icon: 'users', permission: PERMISSIONS.MEMBERS_VIEW },
]);
