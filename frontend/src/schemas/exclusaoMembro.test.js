import { describe, expect, it } from 'vitest';
import { ApiError, TIPOS_ERRO } from '../services/http/apiError';
import { classificarFalhaExclusao, FALHAS_EXCLUSAO } from './exclusaoMembro';

const erro = (tipo, status) => new ApiError({ tipo, status, message: 'x', corpoApi: true });

describe('classificarFalhaExclusao', () => {
  it('409 é a RN14 (membro com histórico financeiro)', () => {
    expect(classificarFalhaExclusao(erro(TIPOS_ERRO.CONFLITO, 409))).toBe(FALHAS_EXCLUSAO.HISTORICO_FINANCEIRO);
  });

  it('404 é membro já removido', () => {
    expect(classificarFalhaExclusao(erro(TIPOS_ERRO.NAO_ENCONTRADO, 404))).toBe(FALHAS_EXCLUSAO.REMOVIDO);
  });

  it('sessão encerrada não vira mensagem no diálogo', () => {
    expect(classificarFalhaExclusao(erro(TIPOS_ERRO.NAO_AUTENTICADO, 401))).toBe(FALHAS_EXCLUSAO.FIM_DE_SESSAO);
  });

  it('demais erros (403, 500, rede) ficam no diálogo', () => {
    expect(classificarFalhaExclusao(erro(TIPOS_ERRO.SEM_PERMISSAO, 403))).toBe(FALHAS_EXCLUSAO.ERRO);
    expect(classificarFalhaExclusao(erro(TIPOS_ERRO.REDE, undefined))).toBe(FALHAS_EXCLUSAO.ERRO);
  });
});
