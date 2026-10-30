import { PERFIS } from '../constants/perfis';
import { LIMITES_USUARIO } from '../constants/usuarios';
import { contarLetras, normalizarEspacos } from '../utils/strings';
import { isEmailValido } from './email';
import { criarMapeadorDeErros } from './errosServidor';

/** Os campos têm os nomes do UsuarioCadastroRequest; na edição o e-mail não é enviado. */
export const CAMPOS_USUARIO = Object.freeze(['nome', 'email', 'perfil']);

/** Valores do formulário a partir de um UsuarioResponse, ou vazios (perfil sem escolha: RN01 pede uma). */
export function valoresIniciaisUsuario(usuario) {
  return {
    nome: usuario?.nome ?? '',
    email: usuario?.email ?? '',
    perfil: usuario?.perfil ?? '',
  };
}

function validarNome(valor) {
  const nome = normalizarEspacos(valor);
  if (!nome) return 'Informe o nome.';
  if (contarLetras(nome) < 3) return 'O nome precisa ter pelo menos 3 letras.';
  if (nome.length > LIMITES_USUARIO.nome) return `Use no máximo ${LIMITES_USUARIO.nome} caracteres.`;
  return null;
}

function validarEmail(valor) {
  const email = valor.trim();
  if (!email) return 'Informe o e-mail.';
  if (email.length > LIMITES_USUARIO.email) return `Use no máximo ${LIMITES_USUARIO.email} caracteres.`;
  if (!isEmailValido(email)) return 'Informe um e-mail válido, como nome@igreja.org.';
  return null;
}

function validarPerfil(valor) {
  return Object.values(PERFIS).includes(valor) ? null : 'Escolha um perfil.';
}

/** Devolve { campo: mensagem } só com os campos inválidos. Na edição o e-mail não é validado (não muda). */
export function validarUsuario(valores, { editando = false } = {}) {
  const erros = {
    nome: validarNome(valores.nome),
    email: editando ? null : validarEmail(valores.email),
    perfil: validarPerfil(valores.perfil),
  };
  return Object.fromEntries(Object.entries(erros).filter(([, mensagem]) => mensagem));
}

/**
 * Cadastro: UsuarioCadastroRequest { nome, email (minúsculo, sem espaços), perfil } — sem senha,
 * o backend envia o convite. Edição: UsuarioAtualizacaoRequest { nome, perfil }.
 */
export function montarPayloadUsuario(valores, { editando = false } = {}) {
  const nome = normalizarEspacos(valores.nome);
  if (editando) return { nome, perfil: valores.perfil };
  return { nome, email: valores.email.replace(/\s/g, '').toLowerCase(), perfil: valores.perfil };
}

/**
 * Erros do servidor → campos do formulário. Provisório: depende do texto exato das mensagens
 * dos DTOs e do UsuarioService (ver schemas/errosServidor.js).
 */
export const mapearErroUsuario = criarMapeadorDeErros({
  campoPorMensagem: {
    'O nome é obrigatório': 'nome',
    'O nome deve ter no máximo 150 caracteres': 'nome',
    'O e-mail é obrigatório': 'email',
    'E-mail inválido': 'email',
    'O e-mail deve ter no máximo 150 caracteres': 'email',
    'O perfil é obrigatório': 'perfil',
  },
  campoPorConflito: [
    { padrao: /e-?mail/i, campo: 'email' },
    // "remover o seu próprio perfil de Administrador" e "pelo menos um Administrador ativo".
    { padrao: /perfil de Administrador|Administrador ativo/i, campo: 'perfil' },
  ],
});
