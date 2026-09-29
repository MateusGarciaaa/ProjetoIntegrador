import { ROLES } from './roles';

export const PERMISSIONS = Object.freeze({
  MEMBERS_VIEW: 'members:view',
  MEMBERS_CREATE: 'members:create',
  MEMBERS_UPDATE: 'members:update',
  MEMBERS_DELETE: 'members:delete',
});

// Espelha 19-Permissoes.md. Serve apenas para ocultar ações na interface:
// o backend continua sendo a autoridade sobre o que cada perfil pode fazer.
const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.PASTOR]: [PERMISSIONS.MEMBERS_VIEW],
  [ROLES.SECRETARIO]: [
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.MEMBERS_CREATE,
    PERMISSIONS.MEMBERS_UPDATE,
  ],
  [ROLES.TESOUREIRO]: [],
  [ROLES.LIDER]: [],
  [ROLES.MEMBRO]: [],
});

export function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
