export type MemberStatus = 'ATIVO' | 'AFASTADO' | 'VISITANTE'

export interface Member {
  id: string
  nome: string
  cpf: string
  email: string
  telefone: string
  endereco: string
  dataNascimento: string
  dataBatismo: string
  dataConversao: string
  status: MemberStatus
}

export type MemberPayload = Omit<Member, 'id'>

export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
}

export interface AuthUser {
  nome: string
  email: string
  perfil: 'ADMINISTRADOR' | 'PASTOR' | 'SECRETARIO' | 'TESOUREIRO' | 'MEMBRO'
}
