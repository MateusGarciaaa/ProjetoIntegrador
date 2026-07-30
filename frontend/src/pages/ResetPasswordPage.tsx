import { useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { authService } from '../services/api'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmation) {
      setError('As senhas não coincidem.')
      return
    }
    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      setDone(true)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível redefinir a senha.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heading={done ? 'Senha atualizada' : 'Crie uma nova senha'}
      description={
        done
          ? 'Seu acesso está pronto para ser usado novamente.'
          : 'Escolha uma senha com pelo menos 6 caracteres.'
      }
    >
      {done ? (
        <div className="auth-success">
          <span className="success-icon"><CheckCircle2 size={28} /></span>
          <h3>Tudo certo!</h3>
          <p>Sua senha foi redefinida com sucesso.</p>
          <Link className="button button-primary button-full" to="/login">
            Entrar no ChurchHub
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="form-alert form-alert-error">{error}</div>}
          <label className="field">
            <span>Nova senha</span>
            <span className="input-with-icon">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo de 6 caracteres"
                required
                minLength={6}
                autoFocus
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <label className="field">
            <span>Confirme a nova senha</span>
            <span className="input-with-icon">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Repita a nova senha"
                required
                minLength={6}
              />
            </span>
          </label>
          <button type="submit" className="button button-primary button-full" disabled={loading}>
            {loading && <span className="spinner spinner-small" />}
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </button>
          <Link className="back-link centered" to="/login">
            <ArrowLeft size={17} /> Voltar para o login
          </Link>
        </form>
      )}
    </AuthShell>
  )
}
