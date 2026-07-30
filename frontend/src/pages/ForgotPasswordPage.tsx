import { useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { authService, demoMode } from '../services/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      setMessage(await authService.forgotPassword(email))
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Não foi possível enviar o link.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heading="Recupere seu acesso"
      description="Informe seu e-mail e enviaremos as orientações para criar uma nova senha."
    >
      {message ? (
        <div className="auth-success">
          <span className="success-icon"><CheckCircle2 size={28} /></span>
          <h3>Confira seu e-mail</h3>
          <p>{message}</p>
          {demoMode && (
            <Link className="button button-primary button-full" to="/redefinir-senha?token=demo-token">
              Simular link recebido
            </Link>
          )}
          <Link className="back-link centered" to="/login">
            <ArrowLeft size={17} /> Voltar para o login
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="form-alert form-alert-error">{error}</div>}
          <label className="field">
            <span>E-mail</span>
            <span className="input-with-icon">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@igreja.com"
                required
                autoFocus
              />
            </span>
          </label>
          <button type="submit" className="button button-primary button-full" disabled={loading}>
            {loading && <span className="spinner spinner-small" />}
            {loading ? 'Enviando...' : 'Enviar orientações'}
          </button>
          <Link className="back-link centered" to="/login">
            <ArrowLeft size={17} /> Voltar para o login
          </Link>
        </form>
      )}
    </AuthShell>
  )
}
