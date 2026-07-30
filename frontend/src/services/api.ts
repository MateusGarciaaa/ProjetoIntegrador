import { mockMembers } from '../data/mockMembers'
import type { AuthUser, Member, MemberPayload, Page } from '../types/member'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1'
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const MEMBERS_KEY = 'churchhub:members'
const TOKEN_KEY = 'churchhub:token'

interface LoginResponse {
  token: string
  type: string
  expiresIn: number
}

interface LoginResult {
  token: string
  user: AuthUser
}

const wait = (milliseconds = 450) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

function getStoredMembers(): Member[] {
  const stored = localStorage.getItem(MEMBERS_KEY)
  if (stored) return JSON.parse(stored) as Member[]
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(mockMembers))
  return [...mockMembers]
}

function saveMembers(members: Member[]) {
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members))
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(error?.message ?? 'Não foi possível concluir a operação.')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResult> {
    if (USE_MOCK) {
      await wait(650)
      if (!email.includes('@') || password.length < 6) {
        throw new Error('E-mail ou senha inválidos.')
      }
      const token = 'churchhub-demo-token'
      localStorage.setItem(TOKEN_KEY, token)
      return {
        token,
        user: {
          nome: 'Mateus Oliveira',
          email,
          perfil: 'ADMINISTRADOR',
        },
      }
    }

    const response = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem(TOKEN_KEY, response.token)
    return {
      token: response.token,
      user: {
        nome: email.split('@')[0],
        email,
        perfil: 'ADMINISTRADOR',
      },
    }
  },

  async forgotPassword(email: string) {
    if (USE_MOCK) {
      await wait(700)
      return 'Se o e-mail existir em nossa base, um link de redefinição foi enviado.'
    }
    return request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }).then((response) => response.message)
  },

  async resetPassword(token: string, newPassword: string) {
    if (USE_MOCK) {
      await wait(700)
      if (!token) throw new Error('Token inválido ou expirado.')
      return
    }
    return request<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    })
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY)
  },
}

export const memberService = {
  async list(name = '', page = 0, size = 8): Promise<Page<Member>> {
    if (!USE_MOCK) {
      const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sort: 'nome,asc',
      })
      if (name.trim()) params.set('nome', name.trim())
      return request<Page<Member>>(`/members?${params.toString()}`)
    }

    await wait(300)
    const query = name.trim().toLocaleLowerCase('pt-BR')
    const filtered = getStoredMembers()
      .filter((member) => member.nome.toLocaleLowerCase('pt-BR').includes(query))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    const content = filtered.slice(page * size, page * size + size)
    const totalPages = Math.ceil(filtered.length / size)
    return {
      content,
      totalElements: filtered.length,
      totalPages,
      number: page,
      size,
      first: page === 0,
      last: page >= totalPages - 1,
    }
  },

  async listAll(): Promise<Member[]> {
    if (USE_MOCK) {
      await wait(250)
      return getStoredMembers()
    }
    const response = await memberService.list('', 0, 200)
    return response.content
  },

  async getById(id: string): Promise<Member> {
    if (!USE_MOCK) return request<Member>(`/members/${id}`)
    await wait(300)
    const member = getStoredMembers().find((item) => item.id === id)
    if (!member) throw new Error('Membro não encontrado.')
    return member
  },

  async create(payload: MemberPayload): Promise<Member> {
    if (!USE_MOCK) {
      return request<Member>('/members', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    }
    await wait(550)
    const members = getStoredMembers()
    if (members.some((member) => member.email.toLowerCase() === payload.email.toLowerCase())) {
      throw new Error('Já existe um membro com este e-mail.')
    }
    if (members.some((member) => member.cpf === payload.cpf)) {
      throw new Error('Já existe um membro com este CPF.')
    }
    const member = { ...payload, id: crypto.randomUUID() }
    saveMembers([...members, member])
    return member
  },

  async update(id: string, payload: MemberPayload): Promise<Member> {
    if (!USE_MOCK) {
      return request<Member>(`/members/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    }
    await wait(550)
    const members = getStoredMembers()
    if (
      members.some(
        (member) =>
          member.id !== id && member.email.toLowerCase() === payload.email.toLowerCase(),
      )
    ) {
      throw new Error('Já existe um membro com este e-mail.')
    }
    if (members.some((member) => member.id !== id && member.cpf === payload.cpf)) {
      throw new Error('Já existe um membro com este CPF.')
    }
    const updated = { ...payload, id }
    saveMembers(members.map((member) => (member.id === id ? updated : member)))
    return updated
  },

  async remove(id: string) {
    if (!USE_MOCK) return request<void>(`/members/${id}`, { method: 'DELETE' })
    await wait(450)
    saveMembers(getStoredMembers().filter((member) => member.id !== id))
  },

  resetDemo() {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(mockMembers))
  },
}

export const demoMode = USE_MOCK
