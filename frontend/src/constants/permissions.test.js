import { describe, expect, it } from 'vitest';
import { PERMISSIONS, hasPermission } from './permissions';
import { ROLES } from './roles';

describe('hasPermission', () => {
  it('administrador pode excluir membros', () => {
    expect(hasPermission(ROLES.ADMIN, PERMISSIONS.MEMBERS_DELETE)).toBe(true);
  });

  it('secretário cadastra e edita, mas não exclui', () => {
    expect(hasPermission(ROLES.SECRETARIO, PERMISSIONS.MEMBERS_CREATE)).toBe(true);
    expect(hasPermission(ROLES.SECRETARIO, PERMISSIONS.MEMBERS_UPDATE)).toBe(true);
    expect(hasPermission(ROLES.SECRETARIO, PERMISSIONS.MEMBERS_DELETE)).toBe(false);
  });

  it('pastor apenas consulta', () => {
    expect(hasPermission(ROLES.PASTOR, PERMISSIONS.MEMBERS_VIEW)).toBe(true);
    expect(hasPermission(ROLES.PASTOR, PERMISSIONS.MEMBERS_CREATE)).toBe(false);
  });

  it('perfil desconhecido ou ausente não tem permissões', () => {
    expect(hasPermission('INEXISTENTE', PERMISSIONS.MEMBERS_VIEW)).toBe(false);
    expect(hasPermission(undefined, PERMISSIONS.MEMBERS_VIEW)).toBe(false);
  });
});
