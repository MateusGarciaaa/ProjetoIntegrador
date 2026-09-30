import { AxiosError, CanceledError } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiError, MENSAGENS_ERRO, TIPOS_ERRO } from './apiError';

function erroHttp(status, data) {
  const config = { url: '/members' };
  return new AxiosError('falhou', AxiosError.ERR_BAD_REQUEST, config, {}, { status, data, config, headers: {} });
}

function corpo(status, message) {
  return { timestamp: '2026-09-30T10:00:00', status, error: 'x', message, path: '/api/v1/members' };
}

describe('ApiError.from', () => {
  it('400 mantém as mensagens de validação juntas', () => {
    const erro = ApiError.from(erroHttp(400, corpo(400, 'O nome é obrigatório, E-mail inválido')));
    expect(erro).toMatchObject({ tipo: TIPOS_ERRO.VALIDACAO, status: 400, message: 'O nome é obrigatório, E-mail inválido', corpoApi: true });
  });

  it('401 do login traz a mensagem do backend', () => {
    const erro = ApiError.from(erroHttp(401, corpo(401, 'E-mail ou senha inválidos')));
    expect(erro.tipo).toBe(TIPOS_ERRO.NAO_AUTENTICADO);
    expect(erro.message).toBe('E-mail ou senha inválidos');
    expect(erro.isSessaoRecusada()).toBe(true);
  });

  it('403 do @PreAuthorize (com corpo) é falta de permissão, não fim de sessão', () => {
    const erro = ApiError.from(erroHttp(403, corpo(403, 'Você não possui permissão para acessar este recurso.')));
    expect(erro.tipo).toBe(TIPOS_ERRO.SEM_PERMISSAO);
    expect(erro.message).toBe('Seu perfil não tem permissão para esta ação.');
    expect(erro.isSessaoRecusada()).toBe(false);
    expect(erro.isFimDeSessao()).toBe(false);
  });

  it('403 sem corpo (entry point padrão do Spring) é sessão recusada', () => {
    const erro = ApiError.from(erroHttp(403, ''));
    expect(erro.tipo).toBe(TIPOS_ERRO.SEM_PERMISSAO);
    expect(erro.corpoApi).toBe(false);
    expect(erro.isSessaoRecusada()).toBe(true);
    expect(erro.isFimDeSessao()).toBe(true);
  });

  it('404 e 409 preservam a mensagem do backend e o path', () => {
    expect(ApiError.from(erroHttp(404, corpo(404, 'Membro não encontrado')))).toMatchObject({
      tipo: TIPOS_ERRO.NAO_ENCONTRADO,
      message: 'Membro não encontrado',
      path: '/api/v1/members',
    });
    expect(ApiError.from(erroHttp(409, corpo(409, 'Já existe um membro com este CPF')))).toMatchObject({
      tipo: TIPOS_ERRO.CONFLITO,
      message: 'Já existe um membro com este CPF',
    });
  });

  it('500 usa mensagem própria e não repassa detalhes do servidor', () => {
    const erro = ApiError.from(erroHttp(500, corpo(500, 'Ocorreu um erro interno no servidor.')));
    expect(erro).toMatchObject({ tipo: TIPOS_ERRO.SERVIDOR, message: MENSAGENS_ERRO.SERVIDOR });
  });

  it('usa mensagens padrão quando o corpo não é um ApiError', () => {
    expect(ApiError.from(erroHttp(404, '<html>')).message).toBe(MENSAGENS_ERRO.NAO_ENCONTRADO);
    expect(ApiError.from(erroHttp(418, null)).tipo).toBe(TIPOS_ERRO.DESCONHECIDO);
  });

  it('diferencia rede fora do ar, tempo esgotado e cancelamento', () => {
    expect(ApiError.from(new AxiosError('Network Error', AxiosError.ERR_NETWORK)).tipo).toBe(TIPOS_ERRO.REDE);
    expect(ApiError.from(new AxiosError('timeout', AxiosError.ECONNABORTED)).tipo).toBe(TIPOS_ERRO.TEMPO_ESGOTADO);
    expect(ApiError.from(new CanceledError()).tipo).toBe(TIPOS_ERRO.CANCELADO);
  });

  it('devolve o mesmo ApiError e embrulha erros quaisquer', () => {
    const original = new ApiError({ tipo: TIPOS_ERRO.SESSAO_EXPIRADA, message: 'x' });
    expect(ApiError.from(original)).toBe(original);
    expect(original.isFimDeSessao()).toBe(true);
    expect(ApiError.from(new TypeError('bug')).tipo).toBe(TIPOS_ERRO.DESCONHECIDO);
  });
});
