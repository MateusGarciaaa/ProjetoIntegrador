import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, CalendarDays, CircleUserRound, Contact, Save } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../context/ToastContext'
import { memberService } from '../services/api'
import type { MemberPayload } from '../types/member'
import { formatCpf, formatPhone } from '../utils/formatters'

const emptyForm: MemberPayload = {
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  endereco: '',
  dataNascimento: '',
  dataBatismo: '',
  dataConversao: '',
  status: 'ATIVO',
}

type FormErrors = Partial<Record<keyof MemberPayload, string>>

export function MemberFormPage() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const [form, setForm] = useState<MemberPayload>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const { showToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (!id) return
    memberService
      .getById(id)
      .then(({ id: _memberId, ...member }) => setForm(member))
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Erro ao carregar membro.'))
      .finally(() => setLoading(false))
  }, [id])

  function updateField(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target
    const normalized =
      name === 'cpf' || name === 'telefone' ? value.replace(/\D/g, '') : value
    setForm((current) => ({ ...current, [name]: normalized }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function validate() {
    const nextErrors: FormErrors = {}
    if (!form.nome.trim()) nextErrors.nome = 'Informe o nome completo.'
    if (form.cpf.length !== 11) nextErrors.cpf = 'O CPF deve conter 11 dígitos.'
    if (!form.email.trim()) {
      nextErrors.email = 'Informe o e-mail.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = 'Informe um e-mail válido.'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const saved =
        isEditing && id
          ? await memberService.update(id, form)
          : await memberService.create(form)
      showToast(isEditing ? 'Cadastro atualizado com sucesso.' : 'Membro cadastrado com sucesso.')
      navigate(`/membros/${saved.id}`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Carregando cadastro..." description="Aguarde um instante." />
        <div className="skeleton form-page-skeleton" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="page-error">
        <h1>Não foi possível abrir o cadastro</h1>
        <p>{loadError}</p>
        <Link to="/membros" className="button button-secondary">
          <ArrowLeft size={18} /> Voltar para membros
        </Link>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow={isEditing ? 'Atualização cadastral' : 'Novo cadastro'}
        title={isEditing ? 'Editar membro' : 'Novo membro'}
        description={
          isEditing
            ? 'Revise e atualize as informações deste membro.'
            : 'Preencha os dados para incluir uma pessoa na comunidade.'
        }
        actions={
          <Link className="button button-secondary" to={isEditing ? `/membros/${id}` : '/membros'}>
            <ArrowLeft size={18} /> Voltar
          </Link>
        }
      />

      <form className="member-form panel" onSubmit={handleSubmit} noValidate>
        <section className="form-section">
          <div className="form-section-heading">
            <span><CircleUserRound size={20} /></span>
            <div>
              <h2>Informações pessoais</h2>
              <p>Dados básicos de identificação do membro.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className={`field field-span-2 ${errors.nome ? 'field-error' : ''}`}>
              <span>Nome completo <em>*</em></span>
              <input
                name="nome"
                value={form.nome}
                onChange={updateField}
                placeholder="Ex.: Maria da Silva"
                autoFocus
              />
              {errors.nome && <small>{errors.nome}</small>}
            </label>
            <label className={`field ${errors.cpf ? 'field-error' : ''}`}>
              <span>CPF <em>*</em></span>
              <input
                name="cpf"
                value={formatCpf(form.cpf)}
                onChange={updateField}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
              {errors.cpf && <small>{errors.cpf}</small>}
            </label>
            <label className="field">
              <span>Data de nascimento</span>
              <input
                name="dataNascimento"
                type="date"
                value={form.dataNascimento}
                onChange={updateField}
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select name="status" value={form.status} onChange={updateField}>
                <option value="ATIVO">Ativo</option>
                <option value="AFASTADO">Afastado</option>
                <option value="VISITANTE">Visitante</option>
              </select>
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <span><Contact size={20} /></span>
            <div>
              <h2>Contato</h2>
              <p>Informações para comunicação e acompanhamento.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className={`field ${errors.email ? 'field-error' : ''}`}>
              <span>E-mail <em>*</em></span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                placeholder="nome@email.com"
              />
              {errors.email && <small>{errors.email}</small>}
            </label>
            <label className="field">
              <span>Telefone</span>
              <input
                name="telefone"
                value={formatPhone(form.telefone)}
                onChange={updateField}
                placeholder="(00) 00000-0000"
                inputMode="tel"
              />
            </label>
            <label className="field field-span-2">
              <span>Endereço</span>
              <input
                name="endereco"
                value={form.endereco}
                onChange={updateField}
                placeholder="Rua, número, bairro e cidade"
              />
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <span><CalendarDays size={20} /></span>
            <div>
              <h2>Jornada de fé</h2>
              <p>Datas importantes na caminhada desta pessoa.</p>
            </div>
          </div>
          <div className="form-grid form-grid-three">
            <label className="field">
              <span>Data de conversão</span>
              <input
                name="dataConversao"
                type="date"
                value={form.dataConversao}
                onChange={updateField}
              />
            </label>
            <label className="field">
              <span>Data de batismo</span>
              <input
                name="dataBatismo"
                type="date"
                value={form.dataBatismo}
                onChange={updateField}
              />
            </label>
          </div>
        </section>

        <footer className="form-actions">
          <span><em>*</em> Campos obrigatórios</span>
          <div>
            <Link className="button button-secondary" to={isEditing ? `/membros/${id}` : '/membros'}>
              Cancelar
            </Link>
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? <span className="spinner spinner-small" /> : <Save size={18} />}
              {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar membro'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
