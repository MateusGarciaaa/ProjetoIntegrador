import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authService, sessionStore } from '../services/auth';
import { setUnauthorizedHandler } from '../services/http/httpClient';
import { hasPermission } from '../constants/permissions';
import { decodeJwtPayload } from '../utils/jwt';

export const AuthContext = createContext(null);

function toUser(token) {
  const claims = decodeJwtPayload(token);
  if (!claims?.sub) return null;
  return { email: claims.sub, name: claims.name ?? claims.sub, role: claims.role };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => sessionStore.read());

  const logout = useCallback(() => {
    sessionStore.clear();
    setSession(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const { token, expiresIn } = await authService.login(credentials);
    setSession(sessionStore.save(token, expiresIn));
  }, []);

  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  useEffect(() => {
    if (!session) return undefined;
    const timeoutId = setTimeout(logout, session.expiresAt - Date.now());
    return () => clearTimeout(timeoutId);
  }, [session, logout]);

  const user = useMemo(() => (session ? toUser(session.token) : null), [session]);
  const can = useCallback((permission) => hasPermission(user?.role, permission), [user]);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, logout, can }),
    [user, login, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
