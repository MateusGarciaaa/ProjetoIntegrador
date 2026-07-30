import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export function LoginPage() {
  const [email, setEmail] = useState('admin@churchhub.com')
  const [password, setPassword] = useState('123456')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user, login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      showToast('Bem-vindo ao ChurchHub!')
      navigate('/dashboard')
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heading="Que bom ter você aqui"
      description="Entre com seus dados para acessar a gestão da sua comunidade."
      footer={
        <p className="auth-help">
          Precisa de ajuda? <a href="mailto:suporte@churchhub.com">Fale com o suporte</a>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="form-alert form-alert-error" role="alert">
            {error}
          </div>
        )}
        <label className="field">
          <span>E-mail</span>
          <span className="input-with-icon">
            <Mail size={18} />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@igreja.com"
              autoComplete="email"
              required
            />
          </span>
        </label>
        <label className="field">
          <span>Senha</span>
          <span className="input-with-icon">
            <LockKeyhole size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              minLength={6}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        <div className="auth-form-row">
          <label className="checkbox-field">
            <input type="checkbox" defaultChecked />
            <span>Lembrar de mim</span>
          </label>
          <Link to="/esqueci-a-senha">Esqueci minha senha</Link>
        </div>
        <button type="submit" className="button button-primary button-full" disabled={loading}>
          {loading && <span className="spinner spinner-small" />}
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <div className="demo-credentials">
          <span>Ambiente de demonstração</span>
          <strong>Os dados de acesso já estão preenchidos.</strong>
        </div>
      </form>
    </AuthShell>
  )
}
