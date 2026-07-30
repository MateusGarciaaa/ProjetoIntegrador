import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Droplets,
  HeartHandshake,
  Plus,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { memberService } from '../services/api'
import type { Member } from '../types/member'
import { firstName, getInitials } from '../utils/formatters'

function getUpcomingBirthdays(members: Member[]) {
  const today = new Date()
  return members
    .filter((member) => member.dataNascimento)
    .map((member) => {
      const [, month, day] = member.dataNascimento.split('-').map(Number)
      const next = new Date(today.getFullYear(), month - 1, day)
      if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        next.setFullYear(today.getFullYear() + 1)
      }
      const days = Math.ceil((next.getTime() - today.getTime()) / 86_400_000)
      return { member, next, days }
    })
    .sort((a, b) => a.next.getTime() - b.next.getTime())
    .slice(0, 3)
}

export function DashboardPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    memberService
      .listAll()
      .then(setMembers)
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const ativos = members.filter((member) => member.status === 'ATIVO').length
    const visitantes = members.filter((member) => member.status === 'VISITANTE').length
    const afastados = members.filter((member) => member.status === 'AFASTADO').length
    const batizados = members.filter((member) => member.dataBatismo).length
    return { ativos, visitantes, afastados, batizados }
  }, [members])

  const upcomingBirthdays = useMemo(() => getUpcomingBirthdays(members), [members])
  const attentionMembers = members
    .filter((member) => member.status !== 'ATIVO')
    .slice(0, 4)
  const total = members.length || 1

  const currentDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date())

  return (
    <div>
      <PageHeader
        eyebrow={currentDate}
        title={`Olá, ${firstName(user?.nome ?? 'Mateus')}`}
        description="Aqui está um resumo da sua comunidade hoje."
        actions={
          <Link className="button button-primary" to="/membros/novo">
            <Plus size={18} /> Novo membro
          </Link>
        }
      />

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section className="stats-grid" aria-label="Resumo dos membros">
            <article className="stat-card">
              <span className="stat-icon stat-icon-primary"><Users size={21} /></span>
              <div className="stat-copy">
                <span>Total de membros</span>
                <strong>{members.length}</strong>
                <small>cadastros na comunidade</small>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-icon stat-icon-success"><UserRoundCheck size={21} /></span>
              <div className="stat-copy">
                <span>Membros ativos</span>
                <strong>{stats.ativos}</strong>
                <small>{Math.round((stats.ativos / total) * 100)}% dos cadastros</small>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-icon stat-icon-gold"><HeartHandshake size={21} /></span>
              <div className="stat-copy">
                <span>Visitantes</span>
                <strong>{stats.visitantes}</strong>
                <small>pessoas em acompanhamento</small>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-icon stat-icon-blue"><Droplets size={21} /></span>
              <div className="stat-copy">
                <span>Com data de batismo</span>
                <strong>{stats.batizados}</strong>
                <small>registros completos</small>
              </div>
            </article>
          </section>

          <section className="dashboard-grid">
            <article className="panel community-panel">
              <header className="panel-header">
                <div>
                  <h2>Retrato da comunidade</h2>
                  <p>Distribuição atual por situação cadastral</p>
                </div>
                <Link to="/membros" className="text-link">
                  Ver membros <ArrowRight size={16} />
                </Link>
              </header>
              <div className="distribution">
                <div className="donut-wrap">
                  <div
                    className="donut"
                    style={{
                      background: `conic-gradient(
                        #2d7664 0 ${(stats.ativos / total) * 100}%,
                        #d3a54e ${(stats.ativos / total) * 100}% ${((stats.ativos + stats.visitantes) / total) * 100}%,
                        #d7d3ca ${((stats.ativos + stats.visitantes) / total) * 100}% 100%
                      )`,
                    }}
                  >
                    <span>
                      <strong>{members.length}</strong>
                      pessoas
                    </span>
                  </div>
                </div>
                <div className="distribution-list">
                  <div>
                    <span className="legend-label"><i className="legend-dot active" /> Ativos</span>
                    <strong>{stats.ativos}</strong>
                    <span className="distribution-percent">
                      {Math.round((stats.ativos / total) * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className="legend-label"><i className="legend-dot visitor" /> Visitantes</span>
                    <strong>{stats.visitantes}</strong>
                    <span className="distribution-percent">
                      {Math.round((stats.visitantes / total) * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className="legend-label"><i className="legend-dot away" /> Afastados</span>
                    <strong>{stats.afastados}</strong>
                    <span className="distribution-percent">
                      {Math.round((stats.afastados / total) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </article>

            <article className="panel birthdays-panel">
              <header className="panel-header">
                <div>
                  <h2>Próximos aniversários</h2>
                  <p>Datas para celebrar em comunidade</p>
                </div>
                <span className="panel-header-icon"><CalendarDays size={20} /></span>
              </header>
              <div className="birthday-list">
                {upcomingBirthdays.map(({ member, next, days }) => (
                  <Link to={`/membros/${member.id}`} key={member.id} className="birthday-row">
                    <span className="avatar avatar-soft">{getInitials(member.nome)}</span>
                    <span className="birthday-person">
                      <strong>{member.nome}</strong>
                      <small>
                        {new Intl.DateTimeFormat('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                        }).format(next)}
                      </small>
                    </span>
                    <span className="birthday-days">
                      {days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `${days} dias`}
                    </span>
                  </Link>
                ))}
              </div>
            </article>
          </section>

          <section className="panel attention-panel">
            <header className="panel-header">
              <div>
                <h2>Acompanhamento</h2>
                <p>Visitantes e membros afastados que merecem atenção</p>
              </div>
              <span className="record-count">{attentionMembers.length} registros</span>
            </header>
            <div className="attention-grid">
              {attentionMembers.map((member) => (
                <Link to={`/membros/${member.id}`} className="attention-card" key={member.id}>
                  <span className="avatar avatar-soft">{getInitials(member.nome)}</span>
                  <span>
                    <strong>{member.nome}</strong>
                    <small>{member.email}</small>
                  </span>
                  <StatusBadge status={member.status} />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-label="Carregando visão geral">
      <div className="stats-grid">
        {[1, 2, 3, 4].map((item) => <div className="skeleton stat-skeleton" key={item} />)}
      </div>
      <div className="dashboard-grid">
        <div className="skeleton panel-skeleton" />
        <div className="skeleton panel-skeleton" />
      </div>
    </div>
  )
}
