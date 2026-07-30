import { ArrowLeft, MapPinned } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="not-found">
      <span><MapPinned size={34} /></span>
      <strong>404</strong>
      <h1>Esta página não foi encontrada</h1>
      <p>O endereço pode ter mudado ou não está mais disponível.</p>
      <Link className="button button-primary" to="/dashboard">
        <ArrowLeft size={18} /> Voltar ao início
      </Link>
    </main>
  )
}
