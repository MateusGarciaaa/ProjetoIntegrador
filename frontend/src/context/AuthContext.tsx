import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { authService } from '../services/api'
import type { AuthUser } from '../types/member'

const USER_KEY = 'churchhub:user'

interface AuthContextValue {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getStoredUser() {
  const stored = localStorage.getItem(USER_KEY)
  return stored ? (JSON.parse(stored) as AuthUser) : null
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser)

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      async login(email, password) {
        const result = await authService.login(email, password)
        localStorage.setItem(USER_KEY, JSON.stringify(result.user))
        setUser(result.user)
      },
      logout() {
        authService.logout()
        localStorage.removeItem(USER_KEY)
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
