import { STATUS_MEMBRO } from '../../../constants/statusMembro';
import { novoId } from '../bancoEmMemoria';
import { erroApi, erroInterno, ok } from '../respostas';

const CAMPOS_ORDENAVEIS = ['id', 'nome', 'cpf', 'email', 'telefone', 'endereco', 'dataNascimento', 'dataBatismo', 'dataConversao', 'status'];
const CAMPOS_DATA = ['dataNascimento', 'dataBatismo', 'dataConversao'];
const EMAIL_HIBERNATE = /^[^\s@]+@[^\s@]+$/;
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function copiar(membro) {
  return { ...membro };
}

/** Falhas de desserialização (data ou enum inválidos) viram 500 no backend. */
export function corpoIlegivel(corpo) {
  if (!corpo || typeof corpo !== 'object') return true;
  const dataRuim = CAMPOS_DATA.some((campo) => corpo[campo] != null && !(typeof corpo[campo] === 'string' && DATA_ISO.test(corpo[campo])));
  const statusRuim = corpo.status != null && !Object.values(STATUS_MEMBRO).includes(corpo.status);
  return dataRuim || statusRuim;
}

/** Mesmas regras e mensagens das anotações do MembroRequest. */
export function validarMembroRequest(corpo) {
  const erros = [];
  const { nome, cpf, email } = corpo;

  if (typeof nome !== 'string' || !nome.trim()) erros.push('O nome é obrigatório');

  if (typeof cpf !== 'string' || !cpf.trim()) erros.push('O CPF é obrigatório');
  if (typeof cpf === 'string' && !/^\d{11}$/.test(cpf)) erros.push('O CPF deve conter 11 dígitos numéricos');

  if (typeof email !== 'string' || !email.trim()) erros.push('O e-mail é obrigatório');
  if (typeof email === 'string' && email.length > 0 && !EMAIL_HIBERNATE.test(email)) erros.push('E-mail inválido');

  return erros;
}

function paraEntidade(corpo, id) {
  return {
    id,
    nome: corpo.nome,
    cpf: corpo.cpf,
    email: corpo.email,
    telefone: corpo.telefone ?? null,
    endereco: corpo.endereco ?? null,
    dataNascimento: corpo.dataNascimento ?? null,
    dataBatismo: corpo.dataBatismo ?? null,
    dataConversao: corpo.dataConversao ?? null,
    status: corpo.status ?? STATUS_MEMBRO.ATIVO,
  };
}

/** Ordem idêntica ao MembroService.validarUnicidade: e-mail primeiro, depois CPF. */
function conflito(banco, corpo, idIgnorado, caminho) {
  if (banco.membros.some((m) => m.email === corpo.email && m.id !== idIgnorado)) {
    return erroApi(409, 'Já existe um membro com este e-mail', caminho);
  }
  if (banco.membros.some((m) => m.cpf === corpo.cpf && m.id !== idIgnorado)) {
    return erroApi(409, 'Já existe um membro com este CPF', caminho);
  }
  return null;
}

function lerOrdenacao(sort) {
  const primeira = Array.isArray(sort) ? sort[0] : sort;
  const [campo, direcao = 'asc'] = String(primeira ?? 'nome').split(',');
  return { campo, fator: direcao.toLowerCase() === 'desc' ? -1 : 1 };
}

function comparar(a, b, campo) {
  if (a[campo] == null) return b[campo] == null ? 0 : 1;
  if (b[campo] == null) return -1;
  return String(a[campo]).localeCompare(String(b[campo]), 'pt-BR');
}

function inteiroNaoNegativo(valor, padrao) {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero >= 0 ? numero : padrao;
}

export function listar({ banco, params, caminho }) {
  const { campo, fator } = lerOrdenacao(params.sort);
  // Campo inexistente gera PropertyReferenceException, que cai no handler de 500.
  if (!CAMPOS_ORDENAVEIS.includes(campo)) return erroInterno(caminho);

  const pagina = inteiroNaoNegativo(params.page, 0);
  const tamanho = Math.min(Math.max(inteiroNaoNegativo(params.size, 20), 1), 2000);
  const nome = typeof params.nome === 'string' ? params.nome : '';

  // StringUtils.hasText + findByNomeContainingIgnoreCase
  const filtrados = nome.trim()
    ? banco.membros.filter((m) => m.nome.toLowerCase().includes(nome.toLowerCase()))
    : banco.membros;
  const ordenados = [...filtrados].sort((a, b) => comparar(a, b, campo) * fator);
  const content = ordenados.slice(pagina * tamanho, pagina * tamanho + tamanho).map(copiar);

  return ok(200, {
    content,
    page: { size: tamanho, number: pagina, totalElements: filtrados.length, totalPages: Math.ceil(filtrados.length / tamanho) },
  });
}

export function buscarPorId({ banco, id, caminho }) {
  const membro = banco.membros.find((m) => m.id === id);
  return membro ? ok(200, copiar(membro)) : erroApi(404, 'Membro não encontrado', caminho);
}

export function cadastrar({ banco, corpo, caminho }) {
  const erro = conflito(banco, corpo, null, caminho);
  if (erro) return erro;
  const membro = paraEntidade(corpo, novoId());
  banco.membros.push(membro);
  return ok(201, copiar(membro));
}

export function atualizar({ banco, id, corpo, caminho }) {
  const indice = banco.membros.findIndex((m) => m.id === id);
  if (indice < 0) return erroApi(404, 'Membro não encontrado', caminho);
  const erro = conflito(banco, corpo, id, caminho);
  if (erro) return erro;
  banco.membros[indice] = paraEntidade(corpo, id);
  return ok(200, copiar(banco.membros[indice]));
}

export function excluir({ banco, id, caminho }) {
  const indice = banco.membros.findIndex((m) => m.id === id);
  if (indice < 0) return erroApi(404, 'Membro não encontrado', caminho);
  banco.membros.splice(indice, 1);
  return ok(204);
}
