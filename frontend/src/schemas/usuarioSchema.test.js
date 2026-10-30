import { describe, expect, it } from 'vitest';
import { OPCOES_PERFIL } from '../constants/usuarios';
import { ApiError, TIPOS_ERRO } from '../services/http/apiError';
import { mapearErroUsuario, montarPayloadUsuario, validarUsuario, valoresIniciaisUsuario } from './usuarioSchema';

const erro = (status, message) =>
  new ApiError({ tipo: status === 409 ? TIPOS_ERRO.CONFLITO : TIPOS_ERRO.VALIDACAO, status, message, corpoApi: true });

describe('usuarioSchema', () => {
  it('oferece os cinco perfis do backend e nenhum "Líder" (RN01)', () => {
    expect(OPCOES_PERFIL.map((o) => o.valor)).toEqual(['ADMINISTRADOR', 'PASTOR', 'SECRETARIO', 'TESOUREIRO', 'MEMBRO']);
    expect(OPCOES_PERFIL.map((o) => o.rotulo)).not.toContain('Líder');
  });

  it('começa sem perfil escolhido no cadastro e com os dados do usuário na edição', () => {
    expect(valoresIniciaisUsuario(null)).toEqual({ nome: '', email: '', perfil: '' });
    expect(valoresIniciaisUsuario({ nome: 'Ana', email: 'ana@x.org', perfil: 'PASTOR', ativo: true })).toEqual({
      nome: 'Ana',
      email: 'ana@x.org',
      perfil: 'PASTOR',
    });
  });

  it('exige nome, e-mail válido e um perfil no cadastro', () => {
    expect(validarUsuario({ nome: ' ', email: 'ana', perfil: '' })).toEqual({
      nome: 'Informe o nome.',
      email: 'Informe um e-mail válido, como nome@igreja.org.',
      perfil: 'Escolha um perfil.',
    });
    expect(validarUsuario({ nome: 'Ana Souza', email: 'ana@igreja.org', perfil: 'LIDER' })).toEqual({ perfil: 'Escolha um perfil.' });
    expect(validarUsuario({ nome: 'a'.repeat(151), email: 'ana@igreja.org', perfil: 'MEMBRO' }).nome).toBe('Use no máximo 150 caracteres.');
  });

  it('na edição o e-mail não é validado nem enviado (não muda)', () => {
    expect(validarUsuario({ nome: 'Ana Souza', email: '', perfil: 'PASTOR' }, { editando: true })).toEqual({});
    expect(montarPayloadUsuario({ nome: '  Ana   Souza ', email: 'x', perfil: 'PASTOR' }, { editando: true })).toEqual({
      nome: 'Ana Souza',
      perfil: 'PASTOR',
    });
  });

  it('o cadastro vai sem senha, com e-mail minúsculo e sem espaços', () => {
    expect(montarPayloadUsuario({ nome: ' Ana ', email: ' Ana@Igreja.ORG ', perfil: 'MEMBRO' })).toEqual({
      nome: 'Ana',
      email: 'ana@igreja.org',
      perfil: 'MEMBRO',
    });
  });

  it('leva os erros do servidor para o campo certo', () => {
    expect(mapearErroUsuario(erro(400, 'O nome é obrigatório, E-mail inválido, O perfil é obrigatório'))).toEqual({
      camposErro: { nome: 'O nome é obrigatório', email: 'E-mail inválido', perfil: 'O perfil é obrigatório' },
      erroGeral: null,
    });
    expect(mapearErroUsuario(erro(409, 'Já existe um usuário com este e-mail')).camposErro).toEqual({
      email: 'Já existe um usuário com este e-mail',
    });
    expect(mapearErroUsuario(erro(409, 'Você não pode remover o seu próprio perfil de Administrador')).camposErro).toHaveProperty(
      'perfil',
    );
    expect(
      mapearErroUsuario(erro(409, 'O sistema precisa de pelo menos um Administrador ativo: cadastre ou ative outro antes')).camposErro,
    ).toHaveProperty('perfil');
  });
});
