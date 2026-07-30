import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  AtSign,
  Cake,
  CalendarCheck,
  CalendarHeart,
  IdCard,
  MapPin,
  Pencil,
  Phone,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmModal } from '../components/ConfirmModal'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../context/ToastContext'
import { memberService } from '../services/api'
import type { Member } from '../types/member'
import { formatCpf, formatDate, formatPhone, getInitials } from '../utils/formatters'

export function MemberDetailPage() {
  const { id } = useParams()
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    if (!id) return
    memberService
      .getById(id)
      .then(setMember)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar membro.'),
      )
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!member) return
    setDeleting(true)
    try {
      await memberService.remove(member.id)
      showToast('Membro excluído com sucesso.')
      navigate('/membros')
    } catch (deleteError) {
      showToast(
        deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir.',
        'error',
      )
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Carregando membro..." description="Aguarde um instante." />
        <div className="skeleton detail-page-skeleton" />
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="page-error">
        <h1>Membro não encontrado</h1>
        <p>{error || 'O cadastro solicitado não está disponível.'}</p>
        <Link to="/membros" className="button button-secondary">
          <ArrowLeft size={18} /> Voltar para membros
        </Link>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Detalhes do cadastro"
        title="Perfil do membro"
        description="Informações pessoais, contato e jornada de fé."
        actions={
          <>
            <Link className="button button-secondary" to="/membros">
              <ArrowLeft size={18} /> Voltar
            </Link>
            <Link className="button button-primary" to={`/membros/${member.id}/editar`}>
              <Pencil size={17} /> Editar
            </Link>
          </>
        }
      />

      <section className="profile-hero panel">
        <div className="profile-identity">
          <span className="profile-avatar">{getInitials(member.nome)}</span>
          <div>
            <span className="profile-label">Membro da comunidade</span>
            <h2>{member.nome}</h2>
            <div className="profile-meta">
              <StatusBadge status={member.status} />
              <span>{member.email}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="button button-danger-ghost"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 size={17} /> Excluir cadastro
        </button>
      </section>

      <div className="detail-grid">
        <section className="panel detail-panel">
          <header>
            <h2>Informações pessoais</h2>
            <p>Dados de identificação e contato.</p>
          </header>
          <dl className="detail-list">
            <DetailItem icon={<IdCard />} label="CPF" value={formatCpf(member.cpf)} />
            <DetailItem icon={<Cake />} label="Nascimento" value={formatDate(member.dataNascimento)} />
            <DetailItem
              icon={<Phone />}
              label="Telefone"
              value={member.telefone ? formatPhone(member.telefone) : 'Não informado'}
            />
            <DetailItem icon={<AtSign />} label="E-mail" value={member.email} />
            <DetailItem
              icon={<MapPin />}
              label="Endereço"
              value={member.endereco || 'Não informado'}
              wide
            />
          </dl>
        </section>

        <section className="panel detail-panel faith-panel">
          <header>
            <h2>Jornada de fé</h2>
            <p>Marcos registrados na caminhada.</p>
          </header>
          <div className="faith-timeline">
            <div className={member.dataConversao ? 'faith-event complete' : 'faith-event'}>
              <span><CalendarHeart size={20} /></span>
              <div>
                <small>Conversão</small>
                <strong>{formatDate(member.dataConversao)}</strong>
              </div>
            </div>
            <div className={member.dataBatismo ? 'faith-event complete' : 'faith-event'}>
              <span><CalendarCheck size={20} /></span>
              <div>
                <small>Batismo</small>
                <strong>{formatDate(member.dataBatismo)}</strong>
              </div>
            </div>
          </div>
        </section>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Excluir membro?"
        description={`${member.nome} será removido definitivamente do cadastro. Esta ação não pode ser desfeita.`}
        loading={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
  )
}

function DetailItem({
  icon,
  label,
  value,
  wide = false,
}: {
  icon: React.ReactElement<{ size?: number }>
  label: string
  value: string
  wide?: boolean
}) {
  return (
    <div className={`detail-item ${wide ? 'wide' : ''}`}>
      <span className="detail-item-icon">{icon}</span>
      <div>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    </div>
  )
}
