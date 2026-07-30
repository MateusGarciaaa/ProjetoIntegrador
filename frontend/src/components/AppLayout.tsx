import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCcw,
  Users,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { demoMode, memberService } from '../services/api'
import { firstName, getInitials } from '../utils/formatters'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Brand } from './Brand'

const navItems = [
  { to: '/dashboard', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/membros', label: 'Membros', icon: Users, end: false },
]

const routeLabels: Record<string, string> = {
  '/dashboard': 'Visão geral',
  '/membros': 'Membros',
  '/membros/novo': 'Novo membro',
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  const pageName =
    routeLabels[location.pathname] ??
    (location.pathname.endsWith('/editar') ? 'Editar membro' : 'Detalhes do membro')

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function handleResetDemo() {
    memberService.resetDemo()
    setUserMenuOpen(false)
    showToast('Dados da demonstração restaurados.')
    navigate('/dashboard')
  }

  return (
    <div className="app-shell">
      <div
        className={`mobile-overlay ${mobileOpen ? 'is-visible' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <Brand inverse />
          <button
            type="button"
            className="icon-button sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="community-label">
          <span className="community-monogram">CE</span>
          <div>
            <span>Comunidade</span>
            <strong>Igreja Esperança</strong>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          <span className="sidebar-section-label">Principal</span>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            >
              <Icon size={19} strokeWidth={1.9} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <CircleHelp size={18} />
          <div>
            <strong>Precisa de ajuda?</strong>
            <span>Central de suporte</span>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-start">
            <button
              type="button"
              className="icon-button mobile-menu-button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>
            <div className="breadcrumb">
              <span>ChurchHub</span>
              <span aria-hidden="true">/</span>
              <strong>{pageName}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            {demoMode && <span className="demo-chip">Modo demonstração</span>}
            <button
              type="button"
              className="icon-button notification-button"
              aria-label="Notificações"
              title="Notificações"
            >
              <Bell size={19} />
              <span className="notification-dot" />
            </button>

            <div className="user-menu-wrap" ref={userMenuRef}>
              <button
                type="button"
                className="user-button"
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-expanded={userMenuOpen}
              >
                <span className="avatar">{getInitials(user?.nome ?? 'Usuário')}</span>
                <span className="user-button-copy">
                  <strong>{firstName(user?.nome ?? 'Usuário')}</strong>
                  <small>Administrador</small>
                </span>
                <ChevronDown size={16} />
              </button>

              {userMenuOpen && (
                <div className="user-menu">
                  <div className="user-menu-heading">
                    <strong>{user?.nome}</strong>
                    <span>{user?.email}</span>
                  </div>
                  {demoMode && (
                    <button type="button" onClick={handleResetDemo}>
                      <RefreshCcw size={17} />
                      Restaurar dados da demonstração
                    </button>
                  )}
                  <button type="button" onClick={handleLogout}>
                    <LogOut size={17} />
                    Sair da conta
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
