import type { PropsWithChildren, ReactNode } from 'react'
import { Check } from 'lucide-react'
import { Brand } from './Brand'

interface AuthShellProps extends PropsWithChildren {
  heading: string
  description: string
  footer?: ReactNode
}

export function AuthShell({ heading, description, footer, children }: AuthShellProps) {
  return (
    <div className="auth-page">
      <section className="auth-story">
        <div className="auth-story-inner">
          <Brand inverse />
          <div className="auth-story-copy">
            <span className="auth-kicker">Pessoas no centro de tudo</span>
            <h1>Cuide melhor da sua comunidade.</h1>
            <p>
              Informações organizadas para uma liderança mais próxima, atenta e
              presente.
            </p>
            <ul>
              <li>
                <span><Check size={15} /></span>
                Cadastro de membros em um só lugar
              </li>
              <li>
                <span><Check size={15} /></span>
                Visão clara da comunidade
              </li>
              <li>
                <span><Check size={15} /></span>
                Acesso simples e seguro
              </li>
            </ul>
          </div>
          <p className="auth-story-footer">
            ChurchHub <span>•</span> Gestão com propósito
          </p>
        </div>
      </section>
      <main className="auth-main">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <section className="auth-card">
          <header>
            <h2>{heading}</h2>
            <p>{description}</p>
          </header>
          {children}
          {footer}
        </section>
      </main>
    </div>
  )
}
