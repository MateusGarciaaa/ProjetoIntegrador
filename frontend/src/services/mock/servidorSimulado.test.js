import { describe, expect, it } from 'vitest';
import { isCpfValido } from '../../utils/cpf';
import { lerUsuarioDoToken } from '../../utils/jwt';
import { CONTAS_DEMO, SENHA_DEMO } from './contasDemo';
import { criarMembrosIniciais } from './dadosIniciais';
import { criarServidorSimulado } from './servidorSimulado';

const AGORA = Date.UTC(2026, 8, 30, 12);

function novoServidor(relogio = () => AGORA) {
  return criarServidorSimulado({ validadeTokenSegundos: 3600, relogio });
}

function entrar(atender, perfil) {
  const conta = CONTAS_DEMO.find((c) => c.perfil === perfil);
  const { data } = atender({ metodo: 'post', url: '/auth/login', corpo: { email: conta.email, password: SENHA_DEMO } });
  return `Bearer ${data.token}`;
}

const novoMembro = {
  nome: 'Paulo Henrique',
  cpf: '12345678909', // válido e fora dos dados de demonstração
  email: 'paulo@igreja.org',
  telefone: null,
  endereco: null,
  dataNascimento: '1990-01-01',
  dataBatismo: null,
  dataConversao: null,
  status: null,
};

describe('dados de demonstração', () => {
  it('tem cerca de 25 membros, com CPFs válidos e únicos e e-mails únicos', () => {
    const membros = criarMembrosIniciais();
    expect(membros.length).toBe(25);
    membros.forEach((m) => expect(isCpfValido(m.cpf)).toBe(true));
    expect(new Set(membros.map((m) => m.cpf)).size).toBe(25);
    expect(new Set(membros.map((m) => m.email)).size).toBe(25);
  });

  it('tem uma conta para cada perfil', () => {
    expect(CONTAS_DEMO.map((c) => c.perfil).sort()).toEqual(['ADMINISTRADOR', 'MEMBRO', 'PASTOR', 'SECRETARIO', 'TESOUREIRO']);
  });
});

describe('login simulado', () => {
  it('devolve LoginResponse e JWT com as claims do backend', () => {
    const atender = novoServidor();
    const { status, data } = atender({
      metodo: 'post',
      url: '/auth/login',
      corpo: { email: 'secretario@churchhub.local', password: SENHA_DEMO },
    });
    expect(status).toBe(200);
    expect(data).toMatchObject({ type: 'Bearer', expiresIn: 3600 });
    expect(lerUsuarioDoToken(data.token)).toEqual({
      email: 'secretario@churchhub.local',
      nome: null,
      perfil: 'SECRETARIO',
      expiraEmSegundos: AGORA / 1000 + 3600,
    });
  });

  it('credenciais erradas geram 401 com a mesma mensagem do backend', () => {
    const { status, data } = novoServidor()({
      metodo: 'post',
      url: '/auth/login',
      corpo: { email: 'secretario@churchhub.local', password: 'errada' },
    });
    expect(status).toBe(401);
    expect(data).toMatchObject({ status: 401, error: 'Unauthorized', message: 'E-mail ou senha inválidos', path: '/api/v1/auth/login' });
  });
});

describe('segurança simulada', () => {
  it('sem token ou com token vencido responde 403 sem corpo, como o Spring sem entry point', () => {
    let agora = AGORA;
    const atender = novoServidor(() => agora);
    expect(atender({ metodo: 'get', url: '/members' })).toEqual({ status: 403, data: '' });

    const authorization = entrar(atender, 'PASTOR');
    agora += 3601 * 1000;
    expect(atender({ metodo: 'get', url: '/members', authorization })).toEqual({ status: 403, data: '' });
  });

  it('perfil sem permissão recebe 403 com corpo', () => {
    const atender = novoServidor();
    const { status, data } = atender({ metodo: 'get', url: '/members', authorization: entrar(atender, 'MEMBRO') });
    expect(status).toBe(403);
    expect(data.message).toBe('Você não possui permissão para acessar este recurso.');
  });

  it('valida o corpo antes do @PreAuthorize, como o Spring MVC', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'PASTOR');
    expect(atender({ metodo: 'post', url: '/members', authorization, corpo: { ...novoMembro, nome: '' } }).status).toBe(400);
    expect(atender({ metodo: 'post', url: '/members', authorization, corpo: novoMembro }).status).toBe(403);
  });
});

describe('membros simulados', () => {
  it('lista paginada, ordenada por nome e filtrada por nome sem diferenciar maiúsculas', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'TESOUREIRO');
    const { data } = atender({ metodo: 'get', url: '/members', authorization, params: { page: 0, size: 10, sort: 'nome,asc' } });
    expect(data.content).toHaveLength(10);
    expect(data.page).toEqual({ size: 10, number: 0, totalElements: 25, totalPages: 3 });
    expect(data.content[0].nome).toBe('Ana Beatriz Carvalho');

    const busca = atender({ metodo: 'get', url: '/members', authorization, params: { nome: 'SILVA', sort: 'nome,asc' } });
    expect(busca.data.page.totalElements).toBe(0);
    const outra = atender({ metodo: 'get', url: '/members', authorization, params: { nome: 'lu', sort: 'nome,asc' } });
    expect(outra.data.content.map((m) => m.nome)).toEqual([
      'André Luiz Fontana',
      'Fernanda Luz Almeida',
      'Lucas Moraes Teixeira',
      'Luíza Bernardes',
    ]);
  });

  it('sort por campo inexistente gera 500', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'PASTOR');
    expect(atender({ metodo: 'get', url: '/members', authorization, params: { sort: 'name,asc' } }).status).toBe(500);
  });

  it('cadastra com status padrão ATIVO e acusa conflito de e-mail antes do de CPF', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'SECRETARIO');
    const criado = atender({ metodo: 'post', url: '/members', authorization, corpo: novoMembro });
    expect(criado.status).toBe(201);
    expect(criado.data.status).toBe('ATIVO');

    const repetido = atender({ metodo: 'post', url: '/members', authorization, corpo: novoMembro });
    expect(repetido).toMatchObject({ status: 409, data: { message: 'Já existe um membro com este e-mail' } });

    const soCpf = atender({ metodo: 'post', url: '/members', authorization, corpo: { ...novoMembro, email: 'outro@igreja.org' } });
    expect(soCpf.data.message).toBe('Já existe um membro com este CPF');
  });

  it('junta as mensagens de validação com ", "', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'ADMINISTRADOR');
    const { status, data } = atender({ metodo: 'post', url: '/members', authorization, corpo: { ...novoMembro, cpf: '123', email: 'x y' } });
    expect(status).toBe(400);
    expect(data.message).toBe('O CPF deve conter 11 dígitos numéricos, E-mail inválido');
  });

  it('atualiza ignorando o próprio registro na unicidade e exclui só como ADMINISTRADOR', () => {
    const atender = novoServidor();
    const admin = entrar(atender, 'ADMINISTRADOR');
    const secretario = entrar(atender, 'SECRETARIO');
    const { data: criado } = atender({ metodo: 'post', url: '/members', authorization: admin, corpo: novoMembro });
    const url = `/members/${criado.id}`;

    const atualizado = atender({ metodo: 'put', url, authorization: secretario, corpo: { ...novoMembro, nome: 'Paulo H. Souza' } });
    expect(atualizado).toMatchObject({ status: 200, data: { nome: 'Paulo H. Souza' } });

    expect(atender({ metodo: 'delete', url, authorization: secretario }).status).toBe(403);
    expect(atender({ metodo: 'delete', url, authorization: admin }).status).toBe(204);
    expect(atender({ metodo: 'delete', url, authorization: admin })).toMatchObject({
      status: 404,
      data: { message: 'Membro não encontrado' },
    });
  });
});
