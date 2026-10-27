import { LIMITES_MEMBRO } from '../constants/membros';
import { isStatusValido, STATUS_PADRAO } from '../constants/statusMembro';
import { formatarCpf, isCpfValido, TAMANHO_CPF } from '../utils/cpf';
import { hojeIso, isDataIsoValida } from '../utils/datas';
import { contarLetras, normalizarEspacos, somenteDigitos, vazioParaNull } from '../utils/strings';
import { formatarTelefone } from '../utils/telefone';
import { isEmailValido } from './email';
import { criarMapeadorDeErros } from './errosServidor';

/** Os campos têm os mesmos nomes do MembroRequest. */
export const CAMPOS_MEMBRO = Object.freeze([
  'nome',
  'cpf',
  'status',
  'email',
  'telefone',
  'endereco',
  'dataNascimento',
  'dataConversao',
  'dataBatismo',
]);

const CAMPOS_DATA = ['dataNascimento', 'dataConversao', 'dataBatismo'];

/** Valores do formulário (sempre texto) a partir de um MembroResponse, ou vazios. */
export function valoresIniciaisMembro(membro) {
  return {
    nome: membro?.nome ?? '',
    cpf: formatarCpf(membro?.cpf ?? ''),
    status: membro?.status ?? STATUS_PADRAO,
    email: membro?.email ?? '',
    telefone: formatarTelefone(membro?.telefone ?? ''),
    endereco: membro?.endereco ?? '',
    dataNascimento: membro?.dataNascimento ?? '',
    dataConversao: membro?.dataConversao ?? '',
    dataBatismo: membro?.dataBatismo ?? '',
  };
}

/** Máscaras aplicadas na digitação. */
export function formatarCampoMembro(campo, valor) {
  if (campo === 'cpf') return formatarCpf(valor);
  if (campo === 'telefone') return formatarTelefone(valor);
  return valor;
}

function validarNome(valor) {
  const nome = normalizarEspacos(valor);
  if (!nome) return 'Informe o nome.';
  if (contarLetras(nome) < 3) return 'O nome precisa ter pelo menos 3 letras.';
  if (nome.length > LIMITES_MEMBRO.nome) return `Use no máximo ${LIMITES_MEMBRO.nome} caracteres.`;
  return null;
}

function validarCpf(valor) {
  const digitos = somenteDigitos(valor);
  if (!digitos) return 'Informe o CPF.';
  if (digitos.length !== TAMANHO_CPF) return 'O CPF precisa ter 11 dígitos.';
  if (!isCpfValido(digitos)) return 'Este CPF não é válido. Confira os números.';
  return null;
}

function validarEmail(valor) {
  const email = valor.trim();
  if (!email) return 'Informe o e-mail.';
  if (email.length > LIMITES_MEMBRO.email) return `Use no máximo ${LIMITES_MEMBRO.email} caracteres.`;
  if (!isEmailValido(email)) return 'Informe um e-mail válido, como nome@igreja.org.';
  return null;
}

function validarTelefone(valor) {
  const digitos = somenteDigitos(valor);
  if (!digitos) return null;
  if (digitos.length < 10) return 'Informe o DDD e o número completo.';
  return null;
}

function validarEndereco(valor) {
  return normalizarEspacos(valor).length > LIMITES_MEMBRO.endereco
    ? `Use no máximo ${LIMITES_MEMBRO.endereco} caracteres.`
    : null;
}

function validarDatas(valores, hoje) {
  const erros = {};
  CAMPOS_DATA.forEach((campo) => {
    const valor = valores[campo];
    if (!valor) return;
    if (!isDataIsoValida(valor)) erros[campo] = 'Informe uma data válida.';
    else if (valor > hoje) erros[campo] = 'A data não pode estar no futuro.';
  });

  const nascimento = erros.dataNascimento ? '' : valores.dataNascimento;
  if (nascimento) {
    if (valores.dataConversao && !erros.dataConversao && valores.dataConversao < nascimento) {
      erros.dataConversao = 'A conversão não pode ser antes do nascimento.';
    }
    if (valores.dataBatismo && !erros.dataBatismo && valores.dataBatismo < nascimento) {
      erros.dataBatismo = 'O batismo não pode ser antes do nascimento.';
    }
  }
  return erros;
}

/** Devolve { campo: mensagem } só com os campos inválidos. */
export function validarMembro(valores, { hoje = hojeIso() } = {}) {
  const erros = {
    nome: validarNome(valores.nome),
    cpf: validarCpf(valores.cpf),
    status: isStatusValido(valores.status) ? null : 'Escolha um status.',
    email: validarEmail(valores.email),
    telefone: validarTelefone(valores.telefone),
    endereco: validarEndereco(valores.endereco),
    ...validarDatas(valores, hoje),
  };
  return Object.fromEntries(Object.entries(erros).filter(([, mensagem]) => mensagem));
}

/** Monta o MembroRequest: só dígitos em CPF/telefone, e-mail minúsculo e vazios como null. */
export function montarPayloadMembro(valores) {
  return {
    nome: normalizarEspacos(valores.nome),
    cpf: somenteDigitos(valores.cpf),
    email: valores.email.replace(/\s/g, '').toLowerCase(),
    telefone: vazioParaNull(somenteDigitos(valores.telefone)),
    endereco: vazioParaNull(normalizarEspacos(valores.endereco)),
    dataNascimento: vazioParaNull(valores.dataNascimento),
    dataBatismo: vazioParaNull(valores.dataBatismo),
    dataConversao: vazioParaNull(valores.dataConversao),
    status: valores.status,
  };
}

/**
 * Erros do servidor → campos do formulário. Provisório: depende do texto exato das
 * mensagens do MembroRequest e do MembroService (ver schemas/errosServidor.js).
 */
export const mapearErroDoServidor = criarMapeadorDeErros({
  campoPorMensagem: {
    'O nome é obrigatório': 'nome',
    'O nome deve ter no máximo 150 caracteres': 'nome',
    'O CPF é obrigatório': 'cpf',
    'O CPF deve conter 11 dígitos numéricos': 'cpf',
    'O e-mail é obrigatório': 'email',
    'E-mail inválido': 'email',
    'O e-mail deve ter no máximo 150 caracteres': 'email',
    'O telefone deve ter no máximo 20 caracteres': 'telefone',
    'O endereço deve ter no máximo 255 caracteres': 'endereco',
  },
  campoPorConflito: [
    { padrao: /e-?mail/i, campo: 'email' },
    { padrao: /\bcpf\b/i, campo: 'cpf' },
  ],
});
