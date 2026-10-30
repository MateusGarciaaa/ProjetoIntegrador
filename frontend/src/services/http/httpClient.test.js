import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenCom } from '../../test-utils/tokens';
import { aoEncerrarSessao, lerSessao, MOTIVOS_FIM_SESSAO, salvarSessao } from '../auth/sessionStore';
import { MENSAGENS_ERRO, TIPOS_ERRO } from './apiError';
import { httpClient } from './httpClient';

const UMA_HORA_S = 3600;

function criarArmazenamentoFalso() {
  const dados = new Map();
  return {
    getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
    setItem: (chave, valor) => dados.set(chave, String(valor)),
    removeItem: (chave) => dados.delete(chave),
  };
}

function iniciarSessao() {
  const exp = Math.floor(Date.now() / 1000) + UMA_HORA_S;
  const token = tokenCom({ sub: 'secretario@churchhub.local', perfil: 'ROLE_SECRETARIO', exp });
  salvarSessao({ token, expiresAt: exp * 1000 });
  return token;
}

/** Corpo no formato do ApiError do GlobalExceptionHandler. */
function corpoApi(status, message, path = '/api/v1/members') {
  return { timestamp: '2026-10-26T10:00:00.123456', status, error: 'Erro', message, path };
}

/** Adapter do axios que responde com o status e o corpo informados. */
function responder(status, data) {
  return (config) => {
    const resposta = { data, status, statusText: '', headers: {}, config, request: {} };
    if (status < 400) return Promise.resolve(resposta);
    return Promise.reject(new AxiosError(`Status ${status}`, AxiosError.ERR_BAD_REQUEST, config, {}, resposta));
  };
}

function falhar(code, message) {
  return (config) => Promise.reject(new AxiosError(message, code, config, {}));
}

async function erroDe(promessa) {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error('A requisição deveria ter falhado.');
}

describe('httpClient', () => {
  let encerramentos;
  let pararDeOuvir;

  beforeEach(() => {
    vi.stubGlobal('window', { sessionStorage: criarArmazenamentoFalso() });
    encerramentos = [];
    pararDeOuvir = aoEncerrarSessao((motivo) => encerramentos.push(motivo));
  });

  afterEach(() => {
    pararDeOuvir();
    vi.unstubAllGlobals();
  });

  it('envia Authorization: Bearer <token> nas rotas protegidas', async () => {
    const token = iniciarSessao();
    const adapter = vi.fn(responder(200, { content: [] }));
    await httpClient.get('/members', { adapter });
    expect(adapter.mock.calls[0][0].headers.Authorization).toBe(`Bearer ${token}`);
  });

  it('repete a chave para parâmetros em lista (sort=a&sort=b), como o Spring espera', async () => {
    iniciarSessao();
    const adapter = vi.fn(responder(200, { content: [] }));
    await httpClient.get('/members', { adapter, params: { sort: ['status,asc', 'nome,asc'], page: 0 } });
    expect(httpClient.getUri(adapter.mock.calls[0][0])).toContain('?sort=status,asc&sort=nome,asc&page=0');
  });

  it('não envia token para /auth/**', async () => {
    iniciarSessao();
    const adapter = vi.fn(responder(200, { token: 'x', expiresIn: 60 }));
    await httpClient.post('/auth/login', {}, { adapter });
    expect(adapter.mock.calls[0][0].headers.Authorization).toBeUndefined();
  });

  it('sem sessão, nem chega a chamar o servidor e encerra como expirada', async () => {
    const adapter = vi.fn(responder(200, {}));
    const erro = await erroDe(httpClient.get('/members', { adapter }));
    expect(adapter).not.toHaveBeenCalled();
    expect(erro.tipo).toBe(TIPOS_ERRO.SESSAO_EXPIRADA);
    expect(encerramentos).toEqual([MOTIVOS_FIM_SESSAO.EXPIRADA]);
  });

  it('401 em rota protegida encerra a sessão', async () => {
    iniciarSessao();
    const adapter = responder(401, corpoApi(401, 'Sessão inválida ou expirada. Faça login novamente.'));
    const erro = await erroDe(httpClient.get('/members', { adapter }));
    expect(erro.tipo).toBe(TIPOS_ERRO.NAO_AUTENTICADO);
    expect(erro.isFimDeSessao()).toBe(true);
    expect(encerramentos).toEqual([MOTIVOS_FIM_SESSAO.RECUSADA]);
    expect(lerSessao()).toBeNull();
  });

  it('401 com motivo (perfil ou senha alterados) encerra a sessão dizendo por quê', async () => {
    iniciarSessao();
    await erroDe(httpClient.get('/members', { adapter: responder(401, corpoApi(401, 'Seu acesso foi alterado. Entre novamente.')) }));
    iniciarSessao();
    await erroDe(httpClient.get('/me', { adapter: responder(401, corpoApi(401, 'Sua senha foi alterada. Entre novamente.')) }));
    expect(encerramentos).toEqual([MOTIVOS_FIM_SESSAO.ACESSO_ALTERADO, MOTIVOS_FIM_SESSAO.SENHA_ALTERADA]);
  });

  it('401 no login é "credenciais inválidas" e não encerra nada', async () => {
    const adapter = responder(401, corpoApi(401, 'E-mail ou senha inválidos', '/api/v1/auth/login'));
    const erro = await erroDe(httpClient.post('/auth/login', {}, { adapter }));
    expect(erro.message).toBe('E-mail ou senha inválidos');
    expect(encerramentos).toEqual([]);
  });

  it('403 com corpo mostra mensagem amigável e mantém a sessão', async () => {
    iniciarSessao();
    const adapter = responder(403, corpoApi(403, 'Você não possui permissão para acessar este recurso.'));
    const erro = await erroDe(httpClient.delete('/members/1', { adapter }));
    expect(erro.tipo).toBe(TIPOS_ERRO.SEM_PERMISSAO);
    expect(erro.message).toBe(MENSAGENS_ERRO.SEM_PERMISSAO);
    expect(erro.isFimDeSessao()).toBe(false);
    expect(encerramentos).toEqual([]);
    expect(lerSessao()).not.toBeNull();
  });

  it('400 de validação traz a mensagem do backend', async () => {
    iniciarSessao();
    const mensagem = 'O CPF é obrigatório, E-mail inválido';
    const erro = await erroDe(httpClient.post('/members', {}, { adapter: responder(400, corpoApi(400, mensagem)) }));
    expect(erro).toMatchObject({ tipo: TIPOS_ERRO.VALIDACAO, status: 400, message: mensagem, corpoApi: true });
    expect(encerramentos).toEqual([]);
  });

  it('409 traz a mensagem do conflito', async () => {
    iniciarSessao();
    const adapter = responder(409, corpoApi(409, 'Já existe um membro com este CPF'));
    const erro = await erroDe(httpClient.post('/members', {}, { adapter }));
    expect(erro).toMatchObject({ tipo: TIPOS_ERRO.CONFLITO, message: 'Já existe um membro com este CPF' });
  });

  it('tempo esgotado e falha de rede viram mensagens amigáveis', async () => {
    iniciarSessao();
    const esgotado = await erroDe(httpClient.get('/members', { adapter: falhar(AxiosError.ECONNABORTED, 'timeout') }));
    expect(esgotado).toMatchObject({ tipo: TIPOS_ERRO.TEMPO_ESGOTADO, message: MENSAGENS_ERRO.TEMPO_ESGOTADO });

    const rede = await erroDe(httpClient.get('/members', { adapter: falhar(AxiosError.ERR_NETWORK, 'Network Error') }));
    expect(rede).toMatchObject({ tipo: TIPOS_ERRO.REDE, message: MENSAGENS_ERRO.REDE });
    expect(encerramentos).toEqual([]);
  });
});
