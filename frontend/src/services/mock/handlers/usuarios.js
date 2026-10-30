import { PERFIS } from '../../../constants/perfis';
import { novoId } from '../bancoEmMemoria';
import { lerPageable, paginaSpring } from '../paginacao';
import { erroApi, ok } from '../respostas';
import { EMAIL_HIBERNATE, gerarLink, invalidarLinksPendentes, normalizarEmail, VALIDADE_CONVITE_MS } from './auth';

const LIMITE_TEXTO = 150;
const CAMPOS_ORDENAVEIS = ['id', 'nome', 'email', 'ativo', 'perfil'];

export const MENSAGENS_USUARIOS = Object.freeze({
  EMAIL_DUPLICADO: 'Já existe um usuário com este e-mail',
  DESATIVAR_A_SI: 'Você não pode desativar a sua própria conta',
  REMOVER_PROPRIO_PERFIL: 'Você não pode remover o seu próprio perfil de Administrador',
  ULTIMO_ADMINISTRADOR: 'O sistema precisa de pelo menos um Administrador ativo: cadastre ou ative outro antes',
  CONVITE_INATIVO: 'Ative o usuário antes de reenviar o convite',
  CONVITE_ACEITO: 'Este usuário já definiu a senha. Se a esqueceu, ele pode usar "Esqueci minha senha" no login',
  NAO_ENCONTRADO: 'Usuário não encontrado',
});

/** LoggingMailSender.sendInviteEmail: mesmo link do reset, com o indicador que só troca o texto da tela. */
export function linkDoConvite(token) {
  return `/reset-password?token=${token}&convite=1`;
}

/** UsuarioResponse (sem senha nem instante da troca). */
function resposta(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    ativo: usuario.ativo,
    convitePendente: usuario.senhaAlteradaEmMs == null,
  };
}

/** Perfil fora do enum NomePerfil (ex.: LIDER) → HttpMessageNotReadableException → 400 fixo. */
function corpoIlegivel(corpo) {
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) return true;
  return corpo.perfil != null && !Object.values(PERFIS).includes(corpo.perfil);
}

function validarNome(nome, erros) {
  if (typeof nome !== 'string' || !nome.trim()) erros.push('O nome é obrigatório');
  if (typeof nome === 'string' && nome.length > LIMITE_TEXTO) erros.push(`O nome deve ter no máximo ${LIMITE_TEXTO} caracteres`);
}

/** Anotações do UsuarioCadastroRequest. */
function validarCadastro({ nome, email, perfil }) {
  const erros = [];
  validarNome(nome, erros);
  if (typeof email !== 'string' || !email.trim()) erros.push('O e-mail é obrigatório');
  if (typeof email === 'string' && email.length > 0 && !EMAIL_HIBERNATE.test(email)) erros.push('E-mail inválido');
  if (typeof email === 'string' && email.length > LIMITE_TEXTO) erros.push(`O e-mail deve ter no máximo ${LIMITE_TEXTO} caracteres`);
  if (perfil == null) erros.push('O perfil é obrigatório');
  return erros;
}

/** Anotações do UsuarioAtualizacaoRequest. */
function validarAtualizacao({ nome, perfil }) {
  const erros = [];
  validarNome(nome, erros);
  if (perfil == null) erros.push('O perfil é obrigatório');
  return erros;
}

/** Valores que o conversor String → Boolean do Spring aceita. */
const BOOLEANOS = Object.freeze({ true: true, on: true, yes: true, 1: true, false: false, off: false, no: false, 0: false });

function lerBooleano(valor) {
  return valor == null || valor === '' ? null : BOOLEANOS[String(valor).toLowerCase()];
}

/** Conversão dos @RequestParam perfil (enum) e ativo (Boolean): valor inválido → 400. */
function validarParametros({ perfil, ativo }) {
  if (perfil != null && perfil !== '' && !Object.values(PERFIS).includes(perfil)) {
    return "Valor inválido para o parâmetro 'perfil'.";
  }
  if (ativo != null && ativo !== '' && lerBooleano(ativo) === undefined) {
    return "Valor inválido para o parâmetro 'ativo'.";
  }
  return null;
}

function comparar(a, b, campo) {
  const [x, y] = [a[campo], b[campo]];
  if (typeof x === 'boolean') return Number(x) - Number(y);
  return String(x).localeCompare(String(y), 'pt-BR');
}

function compararPorCriterios(criterios) {
  return (a, b) => {
    for (const { campo, direcao } of criterios) {
      const resultado = comparar(a, b, campo) * (direcao === 'DESC' ? -1 : 1);
      if (resultado !== 0) return resultado;
    }
    return 0;
  };
}

/** GET /users: filtros nome (contém, ignora maiúsculas), perfil e ativo; padrão sort=nome,id. */
function listar({ banco, params, caminho }) {
  const { pagina, tamanho, criterios } = lerPageable(params, ['nome', 'id']);
  const invalido = criterios.find(({ campo }) => !CAMPOS_ORDENAVEIS.includes(campo));
  if (invalido) return erroApi(400, `Campo de ordenação inválido: '${invalido.campo}'.`, caminho);

  const nome = typeof params.nome === 'string' && params.nome.trim() ? params.nome.trim().toLowerCase() : null;
  const ativo = lerBooleano(params.ativo);
  const filtrados = banco.usuarios
    .filter((u) => !nome || u.nome.toLowerCase().includes(nome))
    .filter((u) => !params.perfil || u.perfil === params.perfil)
    .filter((u) => ativo == null || u.ativo === ativo)
    .sort(compararPorCriterios(criterios));
  return ok(200, paginaSpring(filtrados.map(resposta), { pagina, tamanho }));
}

function buscarAlvo(banco, id) {
  return banco.usuarios.find((u) => u.id === id) ?? null;
}

const naoEncontrado = (caminho) => erroApi(404, MENSAGENS_USUARIOS.NAO_ENCONTRADO, caminho);

/** Sobra algum Administrador ativo além do alvo? (UsuarioService.garantirOutroAdministradorAtivo) */
function haOutroAdministradorAtivo(banco, alvo) {
  return banco.usuarios.some((u) => u.ativo && u.perfil === PERFIS.ADMINISTRADOR && u.id !== alvo.id);
}

function enviarConvite(banco, usuario, agoraMs, aoEnviarEmail) {
  const token = gerarLink(banco, usuario, agoraMs, VALIDADE_CONVITE_MS);
  aoEnviarEmail?.({ para: usuario.email, link: linkDoConvite(token) });
}

/** POST /users: sem senha conhecida, convite pendente, e-mail normalizado e único. */
function cadastrar({ banco, corpo, caminho, agoraMs, aoEnviarEmail }) {
  const email = normalizarEmail(corpo.email);
  if (banco.usuarios.some((u) => u.email === email)) return erroApi(409, MENSAGENS_USUARIOS.EMAIL_DUPLICADO, caminho);

  const usuario = {
    id: novoId(),
    nome: corpo.nome.trim(),
    email,
    perfil: corpo.perfil,
    // Ninguém conhece esta senha: o login só funciona depois do convite aceito.
    senha: novoId(),
    ativo: true,
    senhaAlteradaEmMs: null,
  };
  banco.usuarios.push(usuario);
  enviarConvite(banco, usuario, agoraMs, aoEnviarEmail);
  return ok(201, resposta(usuario));
}

function buscarPorId({ banco, id, caminho }) {
  const usuario = buscarAlvo(banco, id);
  return usuario ? ok(200, resposta(usuario)) : naoEncontrado(caminho);
}

/** PUT /users/{id}: nome e perfil; o Administrador não tira o próprio perfil nem deixa o sistema sem um. */
function atualizar({ banco, id, corpo, caminho, usuario: ator }) {
  const alvo = buscarAlvo(banco, id);
  if (!alvo) return naoEncontrado(caminho);
  if (alvo.perfil === PERFIS.ADMINISTRADOR && corpo.perfil !== PERFIS.ADMINISTRADOR) {
    if (alvo.id === ator.id) return erroApi(409, MENSAGENS_USUARIOS.REMOVER_PROPRIO_PERFIL, caminho);
    if (!haOutroAdministradorAtivo(banco, alvo)) return erroApi(409, MENSAGENS_USUARIOS.ULTIMO_ADMINISTRADOR, caminho);
  }
  alvo.nome = corpo.nome.trim();
  alvo.perfil = corpo.perfil;
  return ok(200, resposta(alvo));
}

/** POST /users/{id}/deactivate: idempotente; derruba a sessão (autenticar confere ativo) e invalida os links. */
function desativar({ banco, id, caminho, usuario: ator }) {
  if (id === ator.id) return erroApi(409, MENSAGENS_USUARIOS.DESATIVAR_A_SI, caminho);
  const alvo = buscarAlvo(banco, id);
  if (!alvo) return naoEncontrado(caminho);
  if (!alvo.ativo) return ok(200, resposta(alvo));
  if (alvo.perfil === PERFIS.ADMINISTRADOR && !haOutroAdministradorAtivo(banco, alvo)) {
    return erroApi(409, MENSAGENS_USUARIOS.ULTIMO_ADMINISTRADOR, caminho);
  }
  alvo.ativo = false;
  invalidarLinksPendentes(banco, alvo);
  return ok(200, resposta(alvo));
}

function ativar({ banco, id, caminho }) {
  const alvo = buscarAlvo(banco, id);
  if (!alvo) return naoEncontrado(caminho);
  alvo.ativo = true;
  return ok(200, resposta(alvo));
}

/** POST /users/{id}/invite: só ativo e com convite pendente; o link anterior deixa de valer. */
function reenviarConvite({ banco, id, caminho, agoraMs, aoEnviarEmail }) {
  const alvo = buscarAlvo(banco, id);
  if (!alvo) return naoEncontrado(caminho);
  if (!alvo.ativo) return erroApi(409, MENSAGENS_USUARIOS.CONVITE_INATIVO, caminho);
  if (alvo.senhaAlteradaEmMs != null) return erroApi(409, MENSAGENS_USUARIOS.CONVITE_ACEITO, caminho);
  enviarConvite(banco, alvo, agoraMs, aoEnviarEmail);
  return ok(204);
}

const SO_ADMIN = [PERFIS.ADMINISTRADOR];
const CORPO_CADASTRO = Object.freeze({ ilegivel: corpoIlegivel, validar: validarCadastro });
const CORPO_ATUALIZACAO = Object.freeze({ ilegivel: corpoIlegivel, validar: validarAtualizacao });

/** Rotas do UsuarioController: hasRole('ADMINISTRADOR') em todas (independente da matriz do frontend). */
export const ROTAS_USUARIOS = Object.freeze([
  { metodo: 'get', padrao: /^\/users$/, perfis: SO_ADMIN, parametros: validarParametros, executar: listar },
  { metodo: 'post', padrao: /^\/users$/, perfis: SO_ADMIN, corpo: CORPO_CADASTRO, executar: cadastrar },
  { metodo: 'get', padrao: /^\/users\/([^/]+)$/, perfis: SO_ADMIN, executar: buscarPorId },
  { metodo: 'put', padrao: /^\/users\/([^/]+)$/, perfis: SO_ADMIN, corpo: CORPO_ATUALIZACAO, executar: atualizar },
  { metodo: 'post', padrao: /^\/users\/([^/]+)\/deactivate$/, perfis: SO_ADMIN, executar: desativar },
  { metodo: 'post', padrao: /^\/users\/([^/]+)\/activate$/, perfis: SO_ADMIN, executar: ativar },
  { metodo: 'post', padrao: /^\/users\/([^/]+)\/invite$/, perfis: SO_ADMIN, executar: reenviarConvite },
]);
