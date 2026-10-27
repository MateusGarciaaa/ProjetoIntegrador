import { LIMITES_MEMBRO } from '../../../constants/membros';
import { PERFIS } from '../../../constants/perfis';
import { STATUS_MEMBRO } from '../../../constants/statusMembro';
import { novoId } from '../bancoEmMemoria';
import { lerPageable, paginaSpring } from '../paginacao';
import { erroApi, ok } from '../respostas';

const CAMPOS_ORDENAVEIS = ['id', 'nome', 'cpf', 'email', 'telefone', 'endereco', 'dataNascimento', 'dataBatismo', 'dataConversao', 'status'];
const CAMPOS_DATA = ['dataNascimento', 'dataBatismo', 'dataConversao'];
const EMAIL_HIBERNATE = /^[^\s@]+@[^\s@]+$/;
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function copiar(membro) {
  return { ...membro };
}

/** Falhas de desserialização (data ou enum inválidos) viram 400 no backend (HttpMessageNotReadableException). */
export function corpoIlegivel(corpo) {
  if (!corpo || typeof corpo !== 'object') return true;
  const dataRuim = CAMPOS_DATA.some((campo) => corpo[campo] != null && !(typeof corpo[campo] === 'string' && DATA_ISO.test(corpo[campo])));
  const statusRuim = corpo.status != null && !Object.values(STATUS_MEMBRO).includes(corpo.status);
  return dataRuim || statusRuim;
}

/** Mesmas regras e mensagens das anotações do MembroRequest. */
export function validarMembroRequest(corpo) {
  const erros = [];
  const { nome, cpf, email, telefone, endereco } = corpo;
  const excede = (valor, limite) => typeof valor === 'string' && valor.length > limite;

  if (typeof nome !== 'string' || !nome.trim()) erros.push('O nome é obrigatório');
  if (excede(nome, LIMITES_MEMBRO.nome)) erros.push(`O nome deve ter no máximo ${LIMITES_MEMBRO.nome} caracteres`);

  if (typeof cpf !== 'string' || !cpf.trim()) erros.push('O CPF é obrigatório');
  if (typeof cpf === 'string' && !/^\d{11}$/.test(cpf)) erros.push('O CPF deve conter 11 dígitos numéricos');

  if (typeof email !== 'string' || !email.trim()) erros.push('O e-mail é obrigatório');
  if (typeof email === 'string' && email.length > 0 && !EMAIL_HIBERNATE.test(email)) erros.push('E-mail inválido');
  if (excede(email, LIMITES_MEMBRO.email)) erros.push(`O e-mail deve ter no máximo ${LIMITES_MEMBRO.email} caracteres`);
  if (excede(telefone, LIMITES_MEMBRO.telefone)) erros.push(`O telefone deve ter no máximo ${LIMITES_MEMBRO.telefone} caracteres`);
  if (excede(endereco, LIMITES_MEMBRO.endereco)) erros.push(`O endereço deve ter no máximo ${LIMITES_MEMBRO.endereco} caracteres`);

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

function comparar(a, b, campo) {
  if (a[campo] == null) return b[campo] == null ? 0 : 1;
  if (b[campo] == null) return -1;
  return String(a[campo]).localeCompare(String(b[campo]), 'pt-BR');
}

export function listar({ banco, params, caminho }) {
  const { pagina, tamanho, campo, direcao } = lerPageable(params, 'nome');
  // Campo inexistente gera PropertyReferenceException, tratada como 400 pelo GlobalExceptionHandler.
  if (!CAMPOS_ORDENAVEIS.includes(campo)) return erroApi(400, `Campo de ordenação inválido: '${campo}'.`, caminho);

  const fator = direcao === 'DESC' ? -1 : 1;
  const nome = typeof params.nome === 'string' ? params.nome : '';

  // StringUtils.hasText + findByNomeContainingIgnoreCase
  const filtrados = nome.trim()
    ? banco.membros.filter((m) => m.nome.toLowerCase().includes(nome.toLowerCase()))
    : banco.membros;
  const ordenados = [...filtrados].sort((a, b) => comparar(a, b, campo) * fator);
  return ok(200, paginaSpring(ordenados.map(copiar), { pagina, tamanho }));
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

const { ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO } = PERFIS;
const CORPO_MEMBRO = Object.freeze({ ilegivel: corpoIlegivel, validar: validarMembroRequest });

/** Rotas do MembroController; "perfis" repete os @PreAuthorize, independente da matriz do frontend. */
export const ROTAS_MEMBROS = Object.freeze([
  { metodo: 'get', padrao: /^\/members$/, perfis: [ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO], executar: listar },
  { metodo: 'post', padrao: /^\/members$/, perfis: [ADMINISTRADOR, SECRETARIO], corpo: CORPO_MEMBRO, executar: cadastrar },
  { metodo: 'get', padrao: /^\/members\/([^/]+)$/, perfis: [ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO], executar: buscarPorId },
  { metodo: 'put', padrao: /^\/members\/([^/]+)$/, perfis: [ADMINISTRADOR, SECRETARIO], corpo: CORPO_MEMBRO, executar: atualizar },
  { metodo: 'delete', padrao: /^\/members\/([^/]+)$/, perfis: [ADMINISTRADOR], executar: excluir },
]);
