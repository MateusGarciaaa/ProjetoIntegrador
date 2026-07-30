import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRoundSearch,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ConfirmModal } from '../components/ConfirmModal'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../context/ToastContext'
import { memberService } from '../services/api'
import type { Member, Page } from '../types/member'
import { formatDate, formatPhone, getInitials } from '../utils/formatters'

const pageSize = 8

export function MembersPage() {
  const [result, setResult] = useState<Page<Member> | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null)
  const { showToast } = useToast()
  const navigate = useNavigate()

  const loadMembers = useCallback(async () => {
    setLoading(true)
    try {
      setResult(await memberService.list(query, page, pageSize))
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao carregar membros.', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, query, showToast])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    setPage(0)
    setQuery(searchInput)
  }

  async function handleDelete() {
    if (!memberToDelete) return
    setDeleting(true)
    try {
      await memberService.remove(memberToDelete.id)
      showToast('Membro excluído com sucesso.')
      setMemberToDelete(null)
      if (result?.content.length === 1 && page > 0) setPage((current) => current - 1)
      else await loadMembers()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao excluir membro.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Gestão de pessoas"
        title="Membros"
        description="Consulte, cadastre e mantenha as informações da sua comunidade."
        actions={
          <Link className="button button-primary" to="/membros/novo">
            <Plus size={18} /> Novo membro
          </Link>
        }
      />

      <section className="panel members-panel">
        <div className="members-toolbar">
          <form className="search-box" onSubmit={handleSearch}>
            <Search size={19} />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar membro por nome..."
              aria-label="Buscar membro por nome"
            />
            <button type="submit">Buscar</button>
          </form>
          <span className="result-summary">
            {result ? `${result.totalElements} ${result.totalElements === 1 ? 'membro' : 'membros'}` : ''}
          </span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Membro</th>
                <th>Contato</th>
                <th>Status</th>
                <th>Data de batismo</th>
                <th><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={5}><div className="skeleton table-skeleton" /></td>
                  </tr>
                ))
              ) : (
                result?.content.map((member) => (
                  <tr key={member.id} onDoubleClick={() => navigate(`/membros/${member.id}`)}>
                    <td>
                      <Link className="member-cell" to={`/membros/${member.id}`}>
                        <span className="avatar avatar-soft">{getInitials(member.nome)}</span>
                        <span>
                          <strong>{member.nome}</strong>
                          <small>{member.email}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className="table-primary">
                        {member.telefone ? formatPhone(member.telefone) : 'Não informado'}
                      </span>
                      <small className="table-secondary">{member.endereco || 'Endereço não informado'}</small>
                    </td>
                    <td><StatusBadge status={member.status} /></td>
                    <td>
                      <span className={member.dataBatismo ? 'table-primary' : 'table-muted'}>
                        {formatDate(member.dataBatismo)}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          className="icon-button"
                          to={`/membros/${member.id}`}
                          aria-label={`Ver ${member.nome}`}
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          className="icon-button"
                          to={`/membros/${member.id}/editar`}
                          aria-label={`Editar ${member.nome}`}
                          title="Editar"
                        >
                          <Pencil size={17} />
                        </Link>
                        <button
                          type="button"
                          className="icon-button icon-button-danger"
                          onClick={() => setMemberToDelete(member)}
                          aria-label={`Excluir ${member.nome}`}
                          title="Excluir"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && result?.content.length === 0 && (
          <div className="empty-state">
            <span><UserRoundSearch size={28} /></span>
            <h3>Nenhum membro encontrado</h3>
            <p>Revise o nome pesquisado ou limpe a busca para ver todos.</p>
            {query && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setSearchInput('')
                  setQuery('')
                  setPage(0)
                }}
              >
                Limpar busca
              </button>
            )}
          </div>
        )}

        {result && result.totalPages > 1 && (
          <footer className="pagination">
            <span>
              Página <strong>{result.number + 1}</strong> de <strong>{result.totalPages}</strong>
            </span>
            <div>
              <button
                type="button"
                className="button button-secondary button-icon"
                onClick={() => setPage((current) => current - 1)}
                disabled={result.first || loading}
                aria-label="Página anterior"
                title="Página anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="button button-secondary button-icon"
                onClick={() => setPage((current) => current + 1)}
                disabled={result.last || loading}
                aria-label="Próxima página"
                title="Próxima página"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </footer>
        )}
      </section>

      <ConfirmModal
        open={Boolean(memberToDelete)}
        title="Excluir membro?"
        description={`${memberToDelete?.nome ?? 'Este membro'} será removido definitivamente do cadastro. Esta ação não pode ser desfeita.`}
        loading={deleting}
        onCancel={() => setMemberToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
