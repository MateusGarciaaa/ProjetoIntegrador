import { describe, expect, it } from 'vitest';
import { isCpfValido } from '../../utils/cpf';
import { lerUsuarioDoToken } from '../../utils/jwt';
import { criarBanco } from './bancoEmMemoria';
import { CONTAS_DEMO, SENHA_DEMO } from './contasDemo';
import { esqueciSenha, redefinirSenha } from './handlers/auth';
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

  it('normaliza o e-mail como o UsuarioDetailsServiceImpl', () => {
    const { status } = novoServidor()({
      metodo: 'post',
      url: '/auth/login',
      corpo: { email: 'Secretario@ChurchHub.LOCAL', password: SENHA_DEMO },
    });
    expect(status).toBe(200);
  });

  it('valida o corpo com as mensagens do LoginRequest', () => {
    const atender = novoServidor();
    expect(atender({ metodo: 'post', url: '/auth/login', corpo: { email: '', password: '' } }).data.message).toBe(
      'O e-mail é obrigatório, A senha é obrigatória',
    );
    expect(atender({ metodo: 'post', url: '/auth/login', corpo: { email: 'sem-arroba', password: 'x' } }).data.message).toBe(
      'E-mail inválido',
    );
    expect(atender({ metodo: 'post', url: '/auth/login', corpoMalformado: true }).status).toBe(400);
  });
});

describe('redefinição de senha simulada', () => {
  const MENSAGEM_FORGOT = 'Se o e-mail existir em nossa base, um link de redefinição foi enviado.';
  const TOKEN_INVALIDO = 'Token de redefinição inválido ou expirado';

  function servidorComCaixa(relogio) {
    const emails = [];
    const atender = criarServidorSimulado({ validadeTokenSegundos: 3600, relogio, aoEnviarEmail: (email) => emails.push(email) });
    return { atender, emails };
  }

  const pedir = (atender, email) => atender({ metodo: 'post', url: '/auth/forgot-password', corpo: { email } });
  const redefinir = (atender, token, newPassword) =>
    atender({ metodo: 'post', url: '/auth/reset-password', corpo: { token, newPassword } });
  const tokenDoLink = (link) => new URLSearchParams(link.split('?')[1]).get('token');

  it('responde igual para e-mail existente e inexistente; só o existente recebe link', () => {
    const { atender, emails } = servidorComCaixa(() => AGORA);
    const existente = pedir(atender, 'pastor@churchhub.local');
    const inexistente = pedir(atender, 'ninguem@churchhub.local');
    expect(existente).toEqual({ status: 200, data: { message: MENSAGEM_FORGOT } });
    expect(inexistente).toEqual(existente);
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({ para: 'pastor@churchhub.local', link: expect.stringMatching(/^\/reset-password\?token=[0-9a-f-]{36}$/) });
  });

  it('normaliza o e-mail no forgot-password, como o login', () => {
    const { atender, emails } = servidorComCaixa(() => AGORA);
    expect(pedir(atender, 'Pastor@ChurchHub.LOCAL').status).toBe(200);
    expect(emails).toEqual([expect.objectContaining({ para: 'pastor@churchhub.local' })]);
  });

  it('pedido novo invalida o link anterior; só o mais recente vale', () => {
    const { atender, emails } = servidorComCaixa(() => AGORA);
    pedir(atender, 'pastor@churchhub.local');
    pedir(atender, 'pastor@churchhub.local');
    const [anterior, maisRecente] = emails.map(({ link }) => tokenDoLink(link));

    expect(redefinir(atender, anterior, 'novaSenha1')).toMatchObject({ status: 400, data: { message: TOKEN_INVALIDO } });
    expect(redefinir(atender, maisRecente, 'novaSenha1').status).toBe(204);
  });

  it('usuário inativo não recebe link, com a mesma resposta; link pendente deixa de valer', () => {
    const banco = criarBanco();
    const emails = [];
    const contexto = { banco, agoraMs: AGORA, caminho: '/auth/reset-password', aoEnviarEmail: (e) => emails.push(e) };
    esqueciSenha({ ...contexto, corpo: { email: 'pastor@churchhub.local' } });
    banco.usuarios.find((u) => u.email === 'pastor@churchhub.local').ativo = false;

    const resposta = esqueciSenha({ ...contexto, corpo: { email: 'pastor@churchhub.local' } });
    expect(resposta).toEqual(esqueciSenha({ ...contexto, corpo: { email: 'ninguem@churchhub.local' } }));
    expect(emails).toHaveLength(1);
    const token = tokenDoLink(emails[0].link);
    expect(redefinirSenha({ ...contexto, corpo: { token, newPassword: 'novaSenha1' } }).status).toBe(400);
  });

  it('senha acima de 72 bytes → 400 com a mensagem do @CabeNoBcrypt (login e reset)', () => {
    const { atender } = servidorComCaixa(() => AGORA);
    const acimaDoLimite = 'é'.repeat(37);
    expect(redefinir(atender, 'x', 'é'.repeat(36)).data.message).toBe(TOKEN_INVALIDO);
    expect(redefinir(atender, 'x', acimaDoLimite).data.message).toBe(
      'A nova senha é longa demais: o limite é de 72 bytes (letras acentuadas e símbolos ocupam 2 ou mais)',
    );
    const login = atender({ metodo: 'post', url: '/auth/login', corpo: { email: 'pastor@churchhub.local', password: acimaDoLimite } });
    expect(login).toMatchObject({ status: 400, data: { message: expect.stringMatching(/^A senha é longa demais/) } });
  });

  it('fluxo completo: link → nova senha (204) → login com a nova; token não pode ser reutilizado', () => {
    const { atender, emails } = servidorComCaixa(() => AGORA);
    pedir(atender, 'pastor@churchhub.local');
    const token = tokenDoLink(emails[0].link);

    expect(redefinir(atender, token, 'novaSenha1')).toEqual({ status: 204, data: '' });
    const login = (password) => atender({ metodo: 'post', url: '/auth/login', corpo: { email: 'pastor@churchhub.local', password } });
    expect(login('novaSenha1').status).toBe(200);
    expect(login(SENHA_DEMO).status).toBe(401);
    expect(redefinir(atender, token, 'outraSenha')).toMatchObject({ status: 400, data: { message: TOKEN_INVALIDO } });
  });

  it('token desconhecido ou com mais de 30 minutos → 400', () => {
    let agora = AGORA;
    const { atender, emails } = servidorComCaixa(() => agora);
    pedir(atender, 'pastor@churchhub.local');
    const token = tokenDoLink(emails[0].link);

    expect(redefinir(atender, 'nao-existe', 'novaSenha1').data.message).toBe(TOKEN_INVALIDO);
    agora = AGORA + 30 * 60 * 1000;
    expect(redefinir(atender, token, 'novaSenha1')).toMatchObject({ status: 400, data: { message: TOKEN_INVALIDO, path: '/api/v1/auth/reset-password' } });
  });

  it('valida os corpos com as mensagens dos DTOs', () => {
    const { atender } = servidorComCaixa(() => AGORA);
    expect(pedir(atender, '').data.message).toBe('O e-mail é obrigatório');
    expect(redefinir(atender, '', '').data.message).toBe('O token é obrigatório, A nova senha é obrigatória, A nova senha deve ter entre 6 e 72 caracteres');
    expect(redefinir(atender, 'x', '12345').data.message).toBe('A nova senha deve ter entre 6 e 72 caracteres');
  });
});

describe('segurança simulada', () => {
  it('sem token ou com token vencido responde 401 com corpo ApiError', () => {
    let agora = AGORA;
    const atender = novoServidor(() => agora);
    const semToken = atender({ metodo: 'get', url: '/members' });
    expect(semToken).toMatchObject({ status: 401, data: { status: 401, error: 'Unauthorized', path: '/api/v1/members' } });

    const authorization = entrar(atender, 'PASTOR');
    agora += 3601 * 1000;
    expect(atender({ metodo: 'get', url: '/members', authorization }).status).toBe(401);
  });

  it('erros de entrada são 400/404/405, nunca 500', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'ADMINISTRADOR');
    expect(atender({ metodo: 'get', url: '/members/123', authorization })).toMatchObject({
      status: 400,
      data: { message: "Valor inválido para o parâmetro 'id'." },
    });
    expect(atender({ metodo: 'post', url: '/members', authorization, corpoMalformado: true }).status).toBe(400);
    expect(atender({ metodo: 'post', url: '/members', authorization, corpo: { ...novoMembro, status: 'X' } }).status).toBe(400);
    expect(atender({ metodo: 'get', url: '/nao-existe', authorization }).status).toBe(404);
    expect(atender({ metodo: 'patch', url: '/members', authorization }).status).toBe(405);
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

describe('rotas públicas simuladas', () => {
  it('caminho inexistente em /auth/** responde 404 sem exigir token, como o permitAll', () => {
    const atender = novoServidor();
    expect(atender({ metodo: 'post', url: '/auth/nao-existe', corpo: {} })).toMatchObject({
      status: 404,
      data: { message: 'Recurso não encontrado.', path: '/api/v1/auth/nao-existe' },
    });
    expect(atender({ metodo: 'get', url: '/auth/login' }).status).toBe(405);
  });
});

describe('página no formato do backend real', () => {
  it('serializa o PageImpl no modo DIRECT (padrão do Spring Boot 4.1)', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'SECRETARIO');
    const { data } = atender({ metodo: 'get', url: '/members', authorization, params: { page: 2, size: 10, sort: 'nome,asc' } });
    const { content, ...metadados } = data;
    expect(content).toHaveLength(5);
    expect(metadados).toEqual({
      pageable: {
        pageNumber: 2,
        pageSize: 10,
        sort: { empty: false, sorted: true, unsorted: false },
        offset: 20,
        paged: true,
        unpaged: false,
      },
      last: true,
      totalElements: 25,
      totalPages: 3,
      size: 10,
      number: 2,
      sort: { empty: false, sorted: true, unsorted: false },
      first: false,
      numberOfElements: 5,
      empty: false,
    });
  });

  it('size acima de 2000 é reduzido em silêncio, como o max-page-size do Spring', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'SECRETARIO');
    const { status, data } = atender({ metodo: 'get', url: '/members', authorization, params: { size: 5000 } });
    expect(status).toBe(200);
    expect(data.size).toBe(2000);
  });
});

describe('ficha completa × busca enxuta de membros', () => {
  const MEMBROS = criarMembrosIniciais();

  it('TESOUREIRO não lê a ficha completa (lista nem detalhe)', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'TESOUREIRO');
    expect(atender({ metodo: 'get', url: '/members', authorization }).status).toBe(403);
    expect(atender({ metodo: 'get', url: `/members/${MEMBROS[0].id}`, authorization }).status).toBe(403);
  });

  it('lookup: A, P, S e T recebem só id, nome e status; MEMBRO recebe 403', () => {
    const atender = novoServidor();
    ['ADMINISTRADOR', 'PASTOR', 'SECRETARIO', 'TESOUREIRO'].forEach((perfil) => {
      const { status, data } = atender({ metodo: 'get', url: '/members/lookup', authorization: entrar(atender, perfil) });
      expect(status).toBe(200);
      expect(Object.keys(data.content[0]).sort()).toEqual(['id', 'nome', 'status']);
    });
    expect(atender({ metodo: 'get', url: '/members/lookup', authorization: entrar(atender, 'MEMBRO') }).status).toBe(403);
  });

  it('lookup: filtra por nome e status, ordena por nome e ignora o sort do cliente', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'TESOUREIRO');
    const params = { nome: 'LU', status: 'ATIVO', sort: 'cpf,desc' };
    const { data } = atender({ metodo: 'get', url: '/members/lookup', authorization, params });

    const esperados = MEMBROS.filter((m) => m.nome.toLowerCase().includes('lu') && m.status === 'ATIVO')
      .map((m) => m.nome)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    expect(esperados.length).toBeGreaterThan(0);
    expect(data.content.map((m) => m.nome)).toEqual(esperados);
    expect(data.content.every((m) => m.status === 'ATIVO')).toBe(true);
  });

  it('lookup: no máximo 20 por página', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'TESOUREIRO');
    const { data } = atender({ metodo: 'get', url: '/members/lookup', authorization, params: { size: 500 } });
    expect(data.size).toBe(20);
    expect(data.content).toHaveLength(20);
    expect(data.totalElements).toBe(MEMBROS.length);
  });

  it('lookup: status inválido gera 400 com a mensagem do backend', () => {
    const atender = novoServidor();
    // Mesmo o MEMBRO recebe 400, não 403: a conversão do parâmetro vem antes do @PreAuthorize.
    const authorization = entrar(atender, 'MEMBRO');
    expect(atender({ metodo: 'get', url: '/members/lookup', authorization, params: { status: 'XYZ' } })).toMatchObject({
      status: 400,
      data: { message: "Valor inválido para o parâmetro 'status'.", path: '/api/v1/members/lookup' },
    });
  });
});

describe('membros simulados', () => {
  it('lista paginada, ordenada por nome e filtrada por nome sem diferenciar maiúsculas', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'SECRETARIO');
    const { data } = atender({ metodo: 'get', url: '/members', authorization, params: { page: 0, size: 10, sort: 'nome,asc' } });
    expect(data.content).toHaveLength(10);
    expect(data.content[0].nome).toBe('Ana Beatriz Carvalho');

    const busca = atender({ metodo: 'get', url: '/members', authorization, params: { nome: 'SILVA', sort: 'nome,asc' } });
    expect(busca.data.totalElements).toBe(0);
    expect(busca.data.empty).toBe(true);
    const outra = atender({ metodo: 'get', url: '/members', authorization, params: { nome: 'lu', sort: 'nome,asc' } });
    expect(outra.data.content.map((m) => m.nome)).toEqual([
      'André Luiz Fontana',
      'Fernanda Luz Almeida',
      'Lucas Moraes Teixeira',
      'Luíza Bernardes',
    ]);
  });

  it('sort por campo inexistente gera 400', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'PASTOR');
    expect(atender({ metodo: 'get', url: '/members', authorization, params: { sort: 'name,asc' } })).toMatchObject({
      status: 400,
      data: { message: "Campo de ordenação inválido: 'name'." },
    });
  });

  it('respeita os limites de tamanho do MembroRequest (@Size)', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'ADMINISTRADOR');
    const { status, data } = atender({ metodo: 'post', url: '/members', authorization, corpo: { ...novoMembro, telefone: '1'.repeat(21) } });
    expect(status).toBe(400);
    expect(data.message).toBe('O telefone deve ter no máximo 20 caracteres');
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
