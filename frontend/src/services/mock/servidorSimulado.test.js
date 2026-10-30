import { describe, expect, it } from 'vitest';
import { isCpfValido } from '../../utils/cpf';
import { lerUsuarioDoToken } from '../../utils/jwt';
import { criarBanco } from './bancoEmMemoria';
import { CONTAS_DEMO, SENHA_DEMO } from './contasDemo';
import { esqueciSenha, redefinirSenha } from './handlers/auth';
import { MENSAGEM_RN09 } from './handlers/eventos';
import { MENSAGEM_RN14 } from './handlers/membros';
import { criarMembrosIniciais } from './dadosIniciais';
import { criarServidorSimulado } from './servidorSimulado';
import { MENSAGENS_BACKEND } from './respostas';

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
      nome: 'Marcos Tavares',
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

describe('membros simulados: contrato do módulo Membros', () => {
  const MEMBROS = criarMembrosIniciais();
  const porEmail = (email) => MEMBROS.find((m) => m.email === email);

  it('RN14: membro com movimentação financeira recebe 409 com a mensagem do MembroService', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'ADMINISTRADOR');
    const ana = porEmail('ana.carvalho@email.com');
    expect(atender({ metodo: 'delete', url: `/members/${ana.id}`, authorization })).toMatchObject({
      status: 409,
      data: { message: MENSAGEM_RN14, path: `/api/v1/members/${ana.id}` },
    });
    // Continua no cadastro; um membro sem movimentação é excluído normalmente.
    expect(atender({ metodo: 'get', url: `/members/${ana.id}`, authorization }).status).toBe(200);
    const bruna = porEmail('bruna.kessler@email.com');
    expect(atender({ metodo: 'delete', url: `/members/${bruna.id}`, authorization }).status).toBe(204);
  });

  it('RN14 consulta as movimentações: os 4 membros com dízimo do DadosDemonstracaoService', () => {
    const { membros, movimentacoes } = criarBanco({ hoje: '2026-09-30' });
    const comMovimentacao = new Set(movimentacoes.map((m) => m.membroId));
    expect(membros.filter((m) => comMovimentacao.has(m.id)).map((m) => m.nome)).toEqual([
      'Ana Beatriz Carvalho',
      'André Luiz Fontana',
      'João Pedro Zanella',
      'Mateus Oliveira Cruz',
    ]);
  });

  it('aceita sort repetido: cada critério desempata o anterior', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'PASTOR');
    const params = { size: 50, sort: ['status,desc', 'nome,asc', 'id,asc'] };
    const { data } = atender({ metodo: 'get', url: '/members', authorization, params });

    const ordemStatus = data.content.map((m) => m.status);
    expect(ordemStatus.indexOf('VISITANTE')).toBe(0);
    expect(ordemStatus.lastIndexOf('AFASTADO')).toBe(ordemStatus.length - 1);
    const visitantes = data.content.filter((m) => m.status === 'VISITANTE').map((m) => m.nome);
    expect(visitantes).toEqual([...visitantes].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  });

  it('sort repetido com um campo inexistente gera 400', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'PASTOR');
    const params = { sort: ['nome,asc', 'idade,desc'] };
    expect(atender({ metodo: 'get', url: '/members', authorization, params })).toMatchObject({
      status: 400,
      data: { message: "Campo de ordenação inválido: 'idade'." },
    });
  });

  it('GET /members filtra por status (com ou sem nome) e mantém a ordenação do cliente', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'SECRETARIO');
    const params = { status: 'VISITANTE', size: 2, sort: 'nome,desc' };
    const { data } = atender({ metodo: 'get', url: '/members', authorization, params });
    expect(data.totalElements).toBe(MEMBROS.filter((m) => m.status === 'VISITANTE').length);
    expect(data.content.map((m) => m.nome)).toEqual(['Rafael Siqueira', 'Isadora Pacheco']);
    expect(data.content.every((m) => Object.keys(m).includes('cpf'))).toBe(true);

    const comNome = atender({ metodo: 'get', url: '/members', authorization, params: { nome: 'lu', status: 'AFASTADO' } });
    expect(comNome.data.content.map((m) => m.nome)).toEqual(['Lucas Moraes Teixeira']);
  });

  it('GET /members com status inválido gera 400 antes do @PreAuthorize', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'TESOUREIRO');
    expect(atender({ metodo: 'get', url: '/members', authorization, params: { status: 'INATIVO' } })).toMatchObject({
      status: 400,
      data: { message: "Valor inválido para o parâmetro 'status'.", path: '/api/v1/members' },
    });
  });

  it('GET /members/{id}: ficha completa; 404 inexistente; 400 se não for UUID', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'PASTOR');
    const { status, data } = atender({ metodo: 'get', url: `/members/${MEMBROS[2].id}`, authorization });
    expect(status).toBe(200);
    expect(data).toEqual(MEMBROS[2]);
    expect(atender({ metodo: 'get', url: '/members/00000000-0000-4000-8000-999999999999', authorization }).status).toBe(404);
    expect(atender({ metodo: 'get', url: '/members/abc', authorization }).status).toBe(400);
  });
});

describe('eventos simulados (EventoController)', () => {
  // AGORA = 30/09/2026 (quarta-feira), 09:00 em São Paulo.
  const ENCERRADO = '5e1f0c2a-8d3b-4c7e-a6f1-000000000007'; // Culto de ação de graças, 23/09 às 19:00
  const FUTURO = '5e1f0c2a-8d3b-4c7e-a6f1-000000000006'; // Conferência de famílias, 30/10 às 19:00
  const novoEvento = { titulo: 'Vigília', descricao: null, data: '2026-11-05', horario: '19:30', local: null };

  function listarEventos(atender, authorization, params = {}) {
    return atender({ metodo: 'get', url: '/events', authorization, params });
  }

  it('dados de demonstração iguais aos do DadosDemonstracaoService, em volta de hoje', () => {
    const atender = novoServidor();
    // Sem sort: vale a ordenação padrão do controller (data, horário, id).
    const { data } = listarEventos(atender, entrar(atender, 'MEMBRO'));
    expect(data.content.map((e) => [e.data, e.horario, e.titulo])).toEqual([
      ['2026-09-23', '19:00:00', 'Culto de ação de graças'],
      ['2026-10-03', '19:30:00', 'Encontro de jovens'],
      ['2026-10-04', '09:00:00', 'Escola Bíblica Dominical'],
      ['2026-10-04', '19:00:00', 'Culto de celebração'],
      ['2026-10-07', '20:00:00', 'Reunião de oração'],
      ['2026-10-12', '08:30:00', 'Ação social no bairro'],
      ['2026-10-30', '19:00:00', 'Conferência de famílias'],
    ]);
  });

  it('perfis do @PreAuthorize: todos consultam (isAuthenticated); S cadastra e edita; só A exclui', () => {
    const atender = novoServidor();
    const como = (perfil) => entrar(atender, perfil);
    expect(listarEventos(atender, como('TESOUREIRO')).status).toBe(200);
    expect(atender({ metodo: 'get', url: `/events/${FUTURO}`, authorization: como('TESOUREIRO') }).status).toBe(200);
    expect(listarEventos(atender, null).status).toBe(401);
    expect(atender({ metodo: 'post', url: '/events', authorization: como('TESOUREIRO'), corpo: novoEvento }).status).toBe(403);
    expect(atender({ metodo: 'post', url: '/events', authorization: como('PASTOR'), corpo: novoEvento }).status).toBe(403);
    expect(atender({ metodo: 'post', url: '/events', authorization: como('MEMBRO'), corpo: novoEvento }).status).toBe(403);
    expect(atender({ metodo: 'post', url: '/events', authorization: como('SECRETARIO'), corpo: novoEvento }).status).toBe(201);
    expect(atender({ metodo: 'delete', url: `/events/${FUTURO}`, authorization: como('SECRETARIO') }).status).toBe(403);
    expect(atender({ metodo: 'delete', url: `/events/${FUTURO}`, authorization: como('ADMINISTRADOR') }).status).toBe(204);
    expect(atender({ metodo: 'get', url: `/events/${FUTURO}`, authorization: como('PASTOR') })).toMatchObject({
      status: 404,
      data: { message: 'Evento não encontrado' },
    });
  });

  it('filtra pelo período (inclusivo) só quando vêm os dois limites, como o EventoService.listar', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'PASTOR');
    const periodo = listarEventos(atender, authorization, { dataInicio: '2026-10-04', dataFim: '2026-10-07' });
    expect(periodo.data.content.map((e) => e.titulo).sort()).toEqual(['Culto de celebração', 'Escola Bíblica Dominical', 'Reunião de oração']);
    expect(listarEventos(atender, authorization, { dataInicio: '2026-10-04' }).data.totalElements).toBe(7);
    expect(listarEventos(atender, authorization, { dataFim: '2026-10-04' }).data.totalElements).toBe(7);
  });

  it('data mal formada na query e sort inexistente geram 400', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'MEMBRO');
    expect(listarEventos(atender, authorization, { dataInicio: '04/10/2026', dataFim: '2026-10-07' }).data.message).toBe(
      "Valor inválido para o parâmetro 'dataInicio'.",
    );
    expect(listarEventos(atender, authorization, { sort: 'inicio,asc' }).data.message).toBe("Campo de ordenação inválido: 'inicio'.");
  });

  it('cadastro valida como o EventoRequest e devolve o horário com segundos, sem mexer na data', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'SECRETARIO');
    const semData = atender({ metodo: 'post', url: '/events', authorization, corpo: { ...novoEvento, titulo: ' ', data: null, horario: null } });
    expect(semData).toMatchObject({ status: 400, data: { message: 'O título é obrigatório, A data é obrigatória, O horário é obrigatório' } });
    expect(atender({ metodo: 'post', url: '/events', authorization, corpo: { ...novoEvento, data: '2026-02-30' } }).data.message).toMatch(
      /^Corpo da requisição inválido/,
    );
    expect(atender({ metodo: 'post', url: '/events', authorization, corpo: { ...novoEvento, horario: '25:00' } }).status).toBe(400);

    const { status, data } = atender({ metodo: 'post', url: '/events', authorization, corpo: novoEvento });
    expect(status).toBe(201);
    expect(data).toMatchObject({ titulo: 'Vigília', data: '2026-11-05', horario: '19:30:00', descricao: null, local: null });
  });

  it('RN09: evento encerrado só o ADMINISTRADOR edita; o SECRETARIO recebe 409 com a mensagem do serviço', () => {
    const atender = novoServidor();
    const corpo = { ...novoEvento, titulo: 'Culto de ação de graças (editado)' };
    const secretario = atender({ metodo: 'put', url: `/events/${ENCERRADO}`, authorization: entrar(atender, 'SECRETARIO'), corpo });
    expect(secretario).toMatchObject({ status: 409, data: { message: MENSAGEM_RN09 } });

    const futuro = atender({ metodo: 'put', url: `/events/${FUTURO}`, authorization: entrar(atender, 'SECRETARIO'), corpo });
    expect(futuro.status).toBe(200);

    const admin = atender({ metodo: 'put', url: `/events/${ENCERRADO}`, authorization: entrar(atender, 'ADMINISTRADOR'), corpo });
    expect(admin).toMatchObject({ status: 200, data: { titulo: 'Culto de ação de graças (editado)' } });
  });

  it('RN09 olha o relógio de São Paulo: o evento encerra no horário de início', () => {
    const noInicio = Date.UTC(2026, 9, 30, 22, 0, 0); // 30/10, 19:00 em São Paulo
    let agora = noInicio - 1000;
    const atender = novoServidor(() => agora);
    const authorization = entrar(atender, 'SECRETARIO');
    const editar = () => atender({ metodo: 'put', url: `/events/${FUTURO}`, authorization, corpo: { ...novoEvento, data: '2026-10-30', horario: '19:00' } });
    expect(editar().status).toBe(200);
    agora = noInicio;
    expect(editar()).toMatchObject({ status: 409, data: { message: MENSAGEM_RN09 } });
  });
});

describe('financeiro simulado (MovimentacaoFinanceiraController e CategoriaFinanceiraController)', () => {
  // AGORA = 30/09/2026 em São Paulo: agosto inteiro e setembro até hoje, como o DadosDemonstracaoService.
  const DIZIMOS = '3a9d2b1c-6e4f-4a8b-9c2d-000000000001';
  const MANUTENCAO = '3a9d2b1c-6e4f-4a8b-9c2d-000000000005';
  const PRIMEIRA = '9b4c7d2e-1f3a-4e6b-8d5c-000000000001'; // Dízimo de 450,00 em 02/08, da Ana
  const ANA = criarMembrosIniciais()[0];
  const SETEMBRO = { dataInicio: '2026-09-01', dataFim: '2026-09-30' };
  const novaMovimentacao = {
    descricao: 'Dízimo',
    valor: 150.5,
    data: '2026-09-29',
    tipo: 'RECEITA',
    categoriaId: DIZIMOS,
    membroId: ANA.id,
  };

  function listar(atender, authorization, params = {}) {
    return atender({ metodo: 'get', url: '/financial', authorization, params });
  }

  function postar(atender, authorization, corpo) {
    return atender({ metodo: 'post', url: '/financial', authorization, corpo });
  }

  it('dados de demonstração: 6 categorias e 11 lançamentos por mês, com os totais do backend real', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'TESOUREIRO');
    expect(atender({ metodo: 'get', url: '/financial-categories', authorization }).data.map((c) => c.nome)).toEqual([
      'Dízimos',
      'Ofertas',
      'Eventos',
      'Água e energia',
      'Manutenção',
      'Ação social',
    ]);
    expect(listar(atender, authorization).data.totalElements).toBe(22);
    expect(listar(atender, authorization, SETEMBRO).data.totalElements).toBe(11);
    expect(atender({ metodo: 'get', url: '/financial/summary', authorization, params: SETEMBRO }).data).toEqual({
      ...SETEMBRO,
      totalReceitas: 4097.9,
      totalDespesas: 2328.5,
      saldo: 1769.4,
    });
    expect(atender({ metodo: 'get', url: `/financial/${PRIMEIRA}`, authorization }).data).toEqual({
      id: PRIMEIRA,
      descricao: 'Dízimo',
      valor: 450,
      data: '2026-08-02',
      tipo: 'RECEITA',
      categoria: { id: DIZIMOS, nome: 'Dízimos', tipo: 'RECEITA' },
      membroId: ANA.id,
      membroNome: 'Ana Beatriz Carvalho',
    });
  });

  it('perfis do @PreAuthorize: A, T e P consultam; A e T lançam; só A exclui; S e M não acessam', () => {
    const atender = novoServidor();
    const como = (perfil) => entrar(atender, perfil);
    const categoria = { nome: 'Missões', tipo: 'RECEITA' };
    ['ADMINISTRADOR', 'TESOUREIRO', 'PASTOR'].forEach((perfil) => {
      expect(listar(atender, como(perfil)).status).toBe(200);
      expect(atender({ metodo: 'get', url: '/financial-categories', authorization: como(perfil) }).status).toBe(200);
    });
    ['SECRETARIO', 'MEMBRO'].forEach((perfil) => {
      expect(listar(atender, como(perfil)).status).toBe(403);
      expect(atender({ metodo: 'get', url: '/financial/summary', authorization: como(perfil), params: SETEMBRO }).status).toBe(403);
      expect(atender({ metodo: 'get', url: '/financial-categories', authorization: como(perfil) }).status).toBe(403);
    });
    expect(postar(atender, como('PASTOR'), novaMovimentacao).status).toBe(403);
    expect(postar(atender, como('TESOUREIRO'), novaMovimentacao).status).toBe(201);
    expect(atender({ metodo: 'post', url: '/financial-categories', authorization: como('PASTOR'), corpo: categoria }).status).toBe(403);
    expect(atender({ metodo: 'delete', url: `/financial/${PRIMEIRA}`, authorization: como('TESOUREIRO') }).status).toBe(403);
    expect(atender({ metodo: 'delete', url: `/financial/${PRIMEIRA}`, authorization: como('ADMINISTRADOR') }).status).toBe(204);
    expect(atender({ metodo: 'get', url: `/financial/${PRIMEIRA}`, authorization: como('PASTOR') })).toMatchObject({
      status: 404,
      data: { message: 'Movimentação financeira não encontrada' },
    });
  });

  it('@Valid com as mensagens do MovimentacaoFinanceiraRequest (RN06/RN07 valor positivo, RN10 categoria)', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'TESOUREIRO');
    const mensagem = (corpo) => postar(atender, authorization, corpo).data.message;
    expect(mensagem({ ...novaMovimentacao, valor: -5 })).toBe('O valor deve ser positivo');
    expect(mensagem({ ...novaMovimentacao, valor: 0, categoriaId: null })).toBe('O valor deve ser positivo, A categoria é obrigatória');
    expect(mensagem({ ...novaMovimentacao, valor: 1.005 })).toBe('O valor deve ter até 10 dígitos inteiros e 2 casas decimais');
    expect(mensagem({ ...novaMovimentacao, valor: 12345678901 })).toBe('O valor deve ter até 10 dígitos inteiros e 2 casas decimais');
    expect(mensagem({})).toBe(
      'A descrição é obrigatória, O valor é obrigatório, A data é obrigatória, O tipo é obrigatório, A categoria é obrigatória',
    );
    expect(mensagem({ ...novaMovimentacao, valor: 'abc' })).toBe(MENSAGENS_BACKEND.CORPO_INVALIDO);
    expect(mensagem({ ...novaMovimentacao, tipo: 'ENTRADA' })).toBe(MENSAGENS_BACKEND.CORPO_INVALIDO);
    // O Jackson aceita o BigDecimal como texto numérico.
    expect(postar(atender, authorization, { ...novaMovimentacao, valor: '10.50' })).toMatchObject({ status: 201, data: { valor: 10.5 } });
  });

  it('regras do serviço: categoria inexistente (404), tipo ≠ categoria (400) e membro inexistente (404)', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'ADMINISTRADOR');
    const outroUuid = '00000000-0000-4000-8000-000000000000';
    expect(postar(atender, authorization, { ...novaMovimentacao, categoriaId: outroUuid })).toMatchObject({
      status: 404,
      data: { message: 'Categoria financeira não encontrada' },
    });
    expect(postar(atender, authorization, { ...novaMovimentacao, categoriaId: MANUTENCAO })).toMatchObject({
      status: 400,
      data: { message: 'O tipo da movimentação (RECEITA) não é compatível com o tipo da categoria (DESPESA)' },
    });
    expect(postar(atender, authorization, { ...novaMovimentacao, membroId: outroUuid })).toMatchObject({
      status: 404,
      data: { message: 'Membro não encontrado' },
    });
    const corpo = { ...novaMovimentacao, membroId: null };
    expect(atender({ metodo: 'put', url: `/financial/${PRIMEIRA}`, authorization, corpo })).toMatchObject({
      status: 200,
      data: { id: PRIMEIRA, valor: 150.5, membroId: null, membroNome: null },
    });
  });

  it('filtra pelo período só com os dois limites; summary exige os dois', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'PASTOR');
    const resumo = (params) => atender({ metodo: 'get', url: '/financial/summary', authorization, params });
    expect(listar(atender, authorization, { dataInicio: '2026-09-01' }).data.totalElements).toBe(22);
    expect(listar(atender, authorization, { dataInicio: '01/09/2026', dataFim: '2026-09-30' }).data.message).toBe(
      "Valor inválido para o parâmetro 'dataInicio'.",
    );
    expect(resumo({ dataInicio: '2026-09-01' }).data.message).toBe("Parâmetro obrigatório ausente: 'dataFim'.");
    const ordenada = listar(atender, authorization, { ...SETEMBRO, sort: ['valor,desc', 'id,asc'] }).data.content;
    expect(ordenada[0]).toMatchObject({ descricao: 'Jantar beneficente', valor: 1250 });
    expect(listar(atender, authorization, { sort: 'categoria.nome,asc' }).status).toBe(400);
  });

  it('filtros tipo e categoriaId: opcionais, combinados com o período, 400 para valor inválido', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'TESOUREIRO');
    const AGUA_E_ENERGIA = '3a9d2b1c-6e4f-4a8b-9c2d-000000000004';
    const total = (params) => listar(atender, authorization, params).data.totalElements;
    expect(total({ ...SETEMBRO, tipo: 'DESPESA' })).toBe(4);
    expect(total({ tipo: 'DESPESA' })).toBe(8);
    expect(total({ ...SETEMBRO, categoriaId: AGUA_E_ENERGIA })).toBe(2);
    expect(total({ ...SETEMBRO, tipo: 'DESPESA', categoriaId: AGUA_E_ENERGIA })).toBe(2);
    expect(total({ ...SETEMBRO, tipo: 'RECEITA', categoriaId: AGUA_E_ENERGIA })).toBe(0);
    // Categoria inexistente é filtro sem resultado (200), não 404.
    expect(listar(atender, authorization, { categoriaId: '00000000-0000-4000-8000-000000000000' })).toMatchObject({
      status: 200,
      data: { totalElements: 0, content: [] },
    });
    // Paginação no servidor sobre o resultado filtrado.
    expect(listar(atender, authorization, { ...SETEMBRO, tipo: 'DESPESA', page: 1, size: 3 }).data).toMatchObject({
      totalElements: 4,
      totalPages: 2,
      number: 1,
    });
    expect(listar(atender, authorization, { tipo: 'receita' })).toMatchObject({
      status: 400,
      data: { message: "Valor inválido para o parâmetro 'tipo'." },
    });
    expect(listar(atender, authorization, { categoriaId: 'dizimos' }).data.message).toBe(
      "Valor inválido para o parâmetro 'categoriaId'.",
    );
    // Como no Spring: o 400 de parâmetro vem antes do @PreAuthorize.
    expect(listar(atender, entrar(atender, 'MEMBRO'), { tipo: 'X' }).status).toBe(400);
  });

  it('categorias: filtro por tipo, @Valid e 409 de nome repetido (comparação exata)', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'TESOUREIRO');
    const criar = (corpo) => atender({ metodo: 'post', url: '/financial-categories', authorization, corpo });
    const listarDoTipo = (tipo) => atender({ metodo: 'get', url: '/financial-categories', authorization, params: { tipo } });
    expect(listarDoTipo('DESPESA').data.map((c) => c.nome)).toEqual(['Água e energia', 'Manutenção', 'Ação social']);
    expect(listarDoTipo('X').data.message).toBe("Valor inválido para o parâmetro 'tipo'.");
    expect(criar({ nome: '', tipo: null }).data.message).toBe('O nome da categoria é obrigatório, O tipo da categoria é obrigatório');
    expect(criar({ nome: 'Dízimos', tipo: 'RECEITA' })).toMatchObject({
      status: 409,
      data: { message: 'Já existe uma categoria com este nome para este tipo' },
    });
    expect(criar({ nome: 'Dízimos', tipo: 'DESPESA' }).status).toBe(201);
    expect(criar({ nome: 'Missões', tipo: 'RECEITA' })).toMatchObject({ status: 201, data: { nome: 'Missões', tipo: 'RECEITA' } });
  });

  it('RN14 acompanha as movimentações: sem lançamentos, o membro pode ser excluído', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'ADMINISTRADOR');
    const { data } = listar(atender, authorization, { size: 2000 });
    expect(atender({ metodo: 'delete', url: `/members/${ANA.id}`, authorization }).status).toBe(409);
    data.content
      .filter((m) => m.membroId === ANA.id)
      .forEach((m) => expect(atender({ metodo: 'delete', url: `/financial/${m.id}`, authorization }).status).toBe(204));
    expect(atender({ metodo: 'delete', url: `/members/${ANA.id}`, authorization }).status).toBe(204);
  });
});

describe('agregações financeiras simuladas (/financial/summary, /series, /categories)', () => {
  const AGOSTO_E_SETEMBRO = { dataInicio: '2026-08-01', dataFim: '2026-09-30' };
  const SETEMBRO = { dataInicio: '2026-09-01', dataFim: '2026-09-30' };
  const AGUA_E_ENERGIA = '3a9d2b1c-6e4f-4a8b-9c2d-000000000004';

  function consultar(atender, authorization, url, params) {
    return atender({ metodo: 'get', url, authorization, params });
  }

  it('summary aceita tipo e categoriaId, como a listagem', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'PASTOR');
    const resumo = (params) => consultar(atender, authorization, '/financial/summary', params).data;
    expect(resumo({ ...SETEMBRO, tipo: 'DESPESA' })).toMatchObject({ totalReceitas: 0, totalDespesas: 2328.5, saldo: -2328.5 });
    expect(resumo({ ...SETEMBRO, categoriaId: AGUA_E_ENERGIA }).totalReceitas).toBe(0);
    expect(resumo({ ...SETEMBRO, categoriaId: AGUA_E_ENERGIA }).totalDespesas).toBeGreaterThan(0);
    expect(resumo({ ...SETEMBRO, tipo: 'receita' }).message).toBe("Valor inválido para o parâmetro 'tipo'.");
  });

  it('série por mês e por dia: só os períodos com lançamento, somando igual ao summary', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'TESOUREIRO');
    const porMes = consultar(atender, authorization, '/financial/summary/series', { ...AGOSTO_E_SETEMBRO, agrupamento: 'MES' }).data;
    expect(porMes.map((p) => p.periodo)).toEqual(['2026-08-01', '2026-09-01']);
    expect(porMes[1]).toEqual({ periodo: '2026-09-01', totalReceitas: 4097.9, totalDespesas: 2328.5, saldo: 1769.4 });

    const porDia = consultar(atender, authorization, '/financial/summary/series', { ...SETEMBRO, agrupamento: 'DIA' }).data;
    expect(porDia.length).toBeGreaterThan(1);
    expect(porDia.every((p) => p.totalReceitas || p.totalDespesas)).toBe(true);
    expect([...porDia.map((p) => p.periodo)].sort()).toEqual(porDia.map((p) => p.periodo));
    const centavos = (campo) => porDia.reduce((soma, p) => soma + Math.round(p[campo] * 100), 0);
    expect(centavos('totalReceitas')).toBe(409790);
    expect(centavos('totalDespesas')).toBe(232850);
  });

  it('totais por categoria: do maior para o menor, com quantidade, filtrando por tipo', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'ADMINISTRADOR');
    const linhas = consultar(atender, authorization, '/financial/summary/categories', { ...SETEMBRO, tipo: 'DESPESA' }).data;
    expect(linhas.length).toBeGreaterThan(0);
    expect(linhas.every((l) => l.categoria.tipo === 'DESPESA')).toBe(true);
    expect(linhas.map((l) => l.total)).toEqual([...linhas.map((l) => l.total)].sort((a, b) => b - a));
    expect(linhas.reduce((soma, l) => soma + Math.round(l.total * 100), 0)).toBe(232850);
    expect(linhas.reduce((soma, l) => soma + l.quantidade, 0)).toBe(4);
  });

  it('validações iguais às do controller e do serviço', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'ADMINISTRADOR');
    const serie = (params) => consultar(atender, authorization, '/financial/summary/series', params).data.message;
    expect(serie(SETEMBRO)).toBe("Parâmetro obrigatório ausente: 'agrupamento'.");
    expect(serie({ ...SETEMBRO, agrupamento: 'SEMANA' })).toBe("Valor inválido para o parâmetro 'agrupamento'.");
    expect(serie({ dataFim: '2026-09-30', agrupamento: 'MES' })).toBe("Parâmetro obrigatório ausente: 'dataInicio'.");
    expect(serie({ ...SETEMBRO, agrupamento: 'MES', categoriaId: 'x' })).toBe("Valor inválido para o parâmetro 'categoriaId'.");
    ['/financial/summary', '/financial/summary/series', '/financial/summary/categories'].forEach((url) => {
      expect(consultar(atender, authorization, url, { dataInicio: '2026-09-30', dataFim: '2026-09-01', agrupamento: 'MES' })).toMatchObject({
        status: 400,
        data: { message: 'A data inicial não pode ser posterior à data final' },
      });
    });
  });

  it('A, T e P consultam; S e M recebem 403', () => {
    const atender = novoServidor();
    ['ADMINISTRADOR', 'TESOUREIRO', 'PASTOR'].forEach((perfil) => {
      const authorization = entrar(atender, perfil);
      expect(consultar(atender, authorization, '/financial/summary/series', { ...SETEMBRO, agrupamento: 'MES' }).status).toBe(200);
      expect(consultar(atender, authorization, '/financial/summary/categories', SETEMBRO).status).toBe(200);
    });
    ['SECRETARIO', 'MEMBRO'].forEach((perfil) => {
      const authorization = entrar(atender, perfil);
      expect(consultar(atender, authorization, '/financial/summary/series', { ...SETEMBRO, agrupamento: 'MES' }).status).toBe(403);
      expect(consultar(atender, authorization, '/financial/summary/categories', SETEMBRO).status).toBe(403);
    });
  });
});

describe('dashboard simulado (DashboardController, RN12)', () => {
  function dashboard(atender, perfil) {
    return atender({ metodo: 'get', url: '/dashboard', authorization: entrar(atender, perfil) });
  }

  it('A e P recebem todos os blocos; o resumo é o do mês atual em São Paulo', () => {
    const atender = novoServidor();
    ['ADMINISTRADOR', 'PASTOR'].forEach((perfil) => {
      const { status, data } = dashboard(atender, perfil);
      expect(status).toBe(200);
      expect(data.totalMembros).toBe(criarMembrosIniciais().length);
      expect(data.membrosAtivos).toBeGreaterThan(0);
      expect(data.membrosAtivos).toBeLessThanOrEqual(data.totalMembros);
      expect(Array.isArray(data.aniversariantesDoMes)).toBe(true);
      expect(data.resumoFinanceiroMesAtual).toEqual({
        dataInicio: '2026-09-01',
        dataFim: '2026-09-30',
        totalReceitas: 4097.9,
        totalDespesas: 2328.5,
        saldo: 1769.4,
      });
    });
  });

  it('S vê membros sem financeiro; T vê financeiro sem membros; M só eventos', () => {
    const atender = novoServidor();
    expect(dashboard(atender, 'SECRETARIO').data).toMatchObject({ resumoFinanceiroMesAtual: null });
    expect(dashboard(atender, 'SECRETARIO').data.totalMembros).not.toBeNull();
    expect(dashboard(atender, 'TESOUREIRO').data).toMatchObject({ totalMembros: null, membrosAtivos: null, aniversariantesDoMes: null });
    expect(dashboard(atender, 'TESOUREIRO').data.resumoFinanceiroMesAtual).not.toBeNull();
    expect(dashboard(atender, 'MEMBRO').data).toMatchObject({
      totalMembros: null,
      membrosAtivos: null,
      aniversariantesDoMes: null,
      resumoFinanceiroMesAtual: null,
    });
    expect(Array.isArray(dashboard(atender, 'MEMBRO').data.proximosEventos)).toBe(true);
  });

  it('próximos eventos: até 5, a partir de hoje, em ordem de data e horário', () => {
    const atender = novoServidor();
    const { proximosEventos } = dashboard(atender, 'MEMBRO').data;
    expect(proximosEventos.length).toBeGreaterThan(0);
    expect(proximosEventos.length).toBeLessThanOrEqual(5);
    expect(proximosEventos.every((e) => e.data >= '2026-09-30')).toBe(true);
    const chaves = proximosEventos.map((e) => `${e.data}T${e.horario}`);
    expect([...chaves].sort()).toEqual(chaves);
    expect(Object.keys(proximosEventos[0]).sort()).toEqual(['data', 'horario', 'id', 'titulo']);
  });

  it('aniversariantes: os do mês do relógio do servidor, ordenados pelo dia', () => {
    const atender = novoServidor();
    const { aniversariantesDoMes } = dashboard(atender, 'SECRETARIO').data;
    const esperados = criarMembrosIniciais().filter((m) => m.dataNascimento?.slice(5, 7) === '09');
    expect(aniversariantesDoMes.map((a) => a.nome).sort()).toEqual(esperados.map((m) => m.nome).sort());
    const dias = aniversariantesDoMes.map((a) => a.dataNascimento.slice(8));
    expect([...dias].sort()).toEqual(dias);
  });

  it('contagens por status separadas, somando o total (S vê; T e M recebem null)', () => {
    const atender = novoServidor();
    const { data } = dashboard(atender, 'SECRETARIO');
    const membros = criarMembrosIniciais();
    const contar = (status) => membros.filter((m) => m.status === status).length;
    expect(data).toMatchObject({ membrosAtivos: contar('ATIVO'), membrosAfastados: contar('AFASTADO'), membrosVisitantes: contar('VISITANTE') });
    expect(data.membrosAtivos + data.membrosAfastados + data.membrosVisitantes).toBe(data.totalMembros);
    for (const perfil of ['TESOUREIRO', 'MEMBRO']) {
      expect(dashboard(atender, perfil).data).toMatchObject({ membrosAfastados: null, membrosVisitantes: null, novosMembros: null, totalNovosMembros: null });
    }
  });

  it('novos membros: os 3 últimos da carga (os demais sem data) e quem for cadastrado, mais recente primeiro', () => {
    let agora = AGORA;
    const atender = novoServidor(() => agora);
    const ultimos = criarMembrosIniciais().slice(-3);
    const antes = dashboard(atender, 'PASTOR').data;
    expect(antes.totalNovosMembros).toBe(3);
    expect(antes.novosMembros.map((m) => m.nome)).toEqual(ultimos.map((m) => m.nome).sort((a, b) => a.localeCompare(b, 'pt-BR')));
    // AGORA = 30/09/2026 12:00 UTC = 09:00 em São Paulo.
    expect(antes.novosMembros[0]).toMatchObject({ criadoEm: '2026-09-30T09:00:00', status: ultimos.find((m) => m.nome === antes.novosMembros[0].nome).status });

    agora = AGORA + 60 * 60 * 1000;
    const authorization = entrar(atender, 'SECRETARIO');
    const criado = atender({ metodo: 'post', url: '/members', authorization, corpo: novoMembro });
    expect(criado.status).toBe(201);
    // MembroResponse não tem a data de cadastro.
    expect(criado.data).not.toHaveProperty('criadoEm');
    const depois = dashboard(atender, 'PASTOR').data;
    expect(depois.totalNovosMembros).toBe(4);
    expect(depois.novosMembros[0]).toEqual({ id: criado.data.id, nome: novoMembro.nome, status: 'ATIVO', criadoEm: '2026-09-30T10:00:00' });

    // A edição não muda a data de cadastro; 31 dias depois ninguém mais é novo.
    atender({ metodo: 'put', url: `/members/${criado.data.id}`, authorization, corpo: { ...novoMembro, nome: 'Paulo H.' } });
    expect(dashboard(atender, 'PASTOR').data.novosMembros[0].criadoEm).toBe('2026-09-30T10:00:00');
    agora = AGORA + 31 * 24 * 60 * 60 * 1000;
    expect(dashboard(atender, 'PASTOR').data).toMatchObject({ novosMembros: [], totalNovosMembros: 0 });
  });

  it('sem token: 401', () => {
    expect(novoServidor()({ metodo: 'get', url: '/dashboard' }).status).toBe(401);
  });
});

describe('sessão simulada (JwtAuthenticationFilter: desativação, senha e perfil)', () => {
  function usuarioDoBanco(atender, perfil) {
    const admin = entrar(atender, 'ADMINISTRADOR');
    const conta = CONTAS_DEMO.find((c) => c.perfil === perfil);
    const lista = atender({ metodo: 'get', url: '/users', authorization: admin, params: { size: '2000' } }).data.content;
    return { admin, alvo: lista.find((u) => u.email === conta.email) };
  }

  it('usuário desativado recebe 401 genérico na requisição seguinte', () => {
    const atender = novoServidor();
    const token = entrar(atender, 'SECRETARIO');
    const { admin, alvo } = usuarioDoBanco(atender, 'SECRETARIO');
    expect(atender({ metodo: 'post', url: `/users/${alvo.id}/deactivate`, authorization: admin }).status).toBe(200);

    expect(atender({ metodo: 'get', url: '/me', authorization: token }).data).toMatchObject({
      status: 401,
      message: MENSAGENS_BACKEND.NAO_AUTENTICADO,
    });
  });

  it('perfil alterado derruba a sessão com o motivo', () => {
    const atender = novoServidor();
    const token = entrar(atender, 'TESOUREIRO');
    const { admin, alvo } = usuarioDoBanco(atender, 'TESOUREIRO');
    atender({ metodo: 'put', url: `/users/${alvo.id}`, authorization: admin, corpo: { nome: alvo.nome, perfil: 'PASTOR' } });

    expect(atender({ metodo: 'get', url: '/me', authorization: token }).data).toMatchObject({
      status: 401,
      message: 'Seu acesso foi alterado. Entre novamente.',
    });
  });
});

describe('Minha conta simulada (MeController)', () => {
  it('todo perfil vê os próprios dados; anônimo recebe 401', () => {
    const atender = novoServidor();
    CONTAS_DEMO.forEach((conta) => {
      const { status, data } = atender({ metodo: 'get', url: '/me', authorization: entrar(atender, conta.perfil) });
      expect(status).toBe(200);
      expect(data).toMatchObject({ nome: conta.nome, email: conta.email, perfil: conta.perfil });
      expect(data).not.toHaveProperty('senha');
    });
    expect(atender({ metodo: 'get', url: '/me' }).status).toBe(401);
  });

  it('valida o corpo como o AlterarSenhaRequest', () => {
    const atender = novoServidor();
    const { status, data } = atender({
      metodo: 'put',
      url: '/me/password',
      authorization: entrar(atender, 'MEMBRO'),
      corpo: { currentPassword: '', newPassword: '12345' },
    });
    expect(status).toBe(400);
    expect(data.message).toBe('A senha atual é obrigatória, A nova senha deve ter entre 6 e 72 caracteres');
  });

  it('senha atual errada e senha repetida são 400', () => {
    const atender = novoServidor();
    const authorization = entrar(atender, 'PASTOR');
    const trocar = (corpo) => atender({ metodo: 'put', url: '/me/password', authorization, corpo });
    expect(trocar({ currentPassword: 'errada', newPassword: 'outra123' }).data).toMatchObject({
      status: 400,
      message: 'A senha atual está incorreta',
    });
    expect(trocar({ currentPassword: SENHA_DEMO, newPassword: SENHA_DEMO }).data).toMatchObject({
      status: 400,
      message: 'A nova senha deve ser diferente da atual',
    });
  });

  it('a troca devolve token novo e derruba os tokens de segundos anteriores', () => {
    let agora = AGORA;
    const atender = novoServidor(() => agora);
    const antigo = entrar(atender, 'PASTOR');

    agora = AGORA + 5400;
    const { status, data } = atender({
      metodo: 'put',
      url: '/me/password',
      authorization: antigo,
      corpo: { currentPassword: SENHA_DEMO, newPassword: 'senhaNova1' },
    });
    expect(status).toBe(200);
    expect(data).toMatchObject({ type: 'Bearer', expiresIn: 3600 });

    // Token devolvido no mesmo segundo da troca vale; o anterior cai com o motivo.
    expect(atender({ metodo: 'get', url: '/me', authorization: `Bearer ${data.token}` }).status).toBe(200);
    expect(atender({ metodo: 'get', url: '/me', authorization: antigo }).data).toMatchObject({
      status: 401,
      message: 'Sua senha foi alterada. Entre novamente.',
    });
    const login = (password) =>
      atender({ metodo: 'post', url: '/auth/login', corpo: { email: 'pastor@churchhub.local', password } }).status;
    expect(login('senhaNova1')).toBe(200);
    expect(login(SENHA_DEMO)).toBe(401);
  });
});

describe('usuários simulados (UsuarioController, RN02)', () => {
  function servidorComCaixa(relogio = () => AGORA) {
    const emails = [];
    const atender = criarServidorSimulado({
      validadeTokenSegundos: 3600,
      relogio,
      aoEnviarEmail: (email) => emails.push(email),
    });
    return { atender, emails, admin: entrar(atender, 'ADMINISTRADOR') };
  }

  const tokenDoLink = (link) => new URLSearchParams(link.split('?')[1]).get('token');

  it('só o Administrador acessa; os demais recebem 403 e o anônimo 401', () => {
    const atender = novoServidor();
    expect(atender({ metodo: 'get', url: '/users', authorization: entrar(atender, 'ADMINISTRADOR') }).status).toBe(200);
    ['PASTOR', 'SECRETARIO', 'TESOUREIRO', 'MEMBRO'].forEach((perfil) => {
      expect(atender({ metodo: 'get', url: '/users', authorization: entrar(atender, perfil) }).status).toBe(403);
    });
    expect(atender({ metodo: 'get', url: '/users' }).status).toBe(401);
  });

  it('lista ordenada por nome, com filtros por perfil e ativo; LIDER é 400', () => {
    const { atender, admin } = servidorComCaixa();
    const listar = (params) => atender({ metodo: 'get', url: '/users', authorization: admin, params });
    const todos = listar({}).data;
    const nomes = todos.content.map((u) => u.nome);
    expect(todos.totalElements).toBe(5);
    expect(nomes).toEqual([...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    expect(todos.content[0]).toEqual(expect.objectContaining({ ativo: true, convitePendente: false }));
    expect(listar({ perfil: 'TESOUREIRO' }).data.content.map((u) => u.email)).toEqual(['tesoureiro@churchhub.local']);
    expect(listar({ ativo: 'false' }).data.totalElements).toBe(0);
    expect(listar({ perfil: 'LIDER' }).data.message).toBe("Valor inválido para o parâmetro 'perfil'.");
    expect(listar({ ativo: 'talvez' }).status).toBe(400);
  });

  it('cadastro: e-mail normalizado, convite pendente, link com o indicador e 409 de e-mail repetido', () => {
    const { atender, admin, emails } = servidorComCaixa();
    const cadastrar = (corpo) => atender({ metodo: 'post', url: '/users', authorization: admin, corpo });
    const { status, data } = cadastrar({ nome: ' Paula Lima ', email: 'Paula@Igreja.ORG', perfil: 'PASTOR' });
    expect(status).toBe(201);
    expect(data).toMatchObject({ nome: 'Paula Lima', email: 'paula@igreja.org', perfil: 'PASTOR', ativo: true, convitePendente: true });
    expect(emails).toHaveLength(1);
    expect(emails[0].link).toMatch(/^\/reset-password\?token=[^&]+&convite=1$/);

    expect(cadastrar({ nome: 'Outra', email: 'PAULA@igreja.org', perfil: 'MEMBRO' }).data).toMatchObject({
      status: 409,
      message: 'Já existe um usuário com este e-mail',
    });
    expect(cadastrar({ nome: 'X', email: 'x@igreja.org', perfil: 'LIDER' }).data.message).toBe(MENSAGENS_BACKEND.CORPO_INVALIDO);
    expect(cadastrar({ nome: '', email: 'invalido' }).data.message).toBe('O nome é obrigatório, E-mail inválido, O perfil é obrigatório');
  });

  it('convite vale 72 horas, o reenvio invalida o anterior e o aceite encerra a pendência', () => {
    let agora = AGORA;
    const { atender, admin, emails } = servidorComCaixa(() => agora);
    const { data: criado } = atender({
      metodo: 'post',
      url: '/users',
      authorization: admin,
      corpo: { nome: 'Novo', email: 'novo@igreja.org', perfil: 'MEMBRO' },
    });
    expect(atender({ metodo: 'post', url: `/users/${criado.id}/invite`, authorization: admin }).status).toBe(204);
    const [primeiro, segundo] = emails.map(({ link }) => tokenDoLink(link));
    const aceitar = (token) =>
      atender({ metodo: 'post', url: '/auth/reset-password', corpo: { token, newPassword: 'senhaNova1' } }).status;

    agora = AGORA + 71 * 60 * 60 * 1000;
    expect(aceitar(primeiro)).toBe(400);
    expect(aceitar(segundo)).toBe(204);

    expect(atender({ metodo: 'get', url: `/users/${criado.id}`, authorization: entrar(atender, 'ADMINISTRADOR') }).data.convitePendente).toBe(false);
    expect(
      atender({ metodo: 'post', url: `/users/${criado.id}/invite`, authorization: entrar(atender, 'ADMINISTRADOR') }).data.message,
    ).toMatch(/^Este usuário já definiu a senha/);
  });

  it('convite vencido depois de 72 horas', () => {
    let agora = AGORA;
    const { atender, admin, emails } = servidorComCaixa(() => agora);
    atender({ metodo: 'post', url: '/users', authorization: admin, corpo: { nome: 'Novo', email: 'novo@igreja.org', perfil: 'MEMBRO' } });
    agora = AGORA + 72 * 60 * 60 * 1000;
    const token = tokenDoLink(emails[0].link);
    expect(atender({ metodo: 'post', url: '/auth/reset-password', corpo: { token, newPassword: 'senhaNova1' } }).status).toBe(400);
  });

  it('o Administrador não se desativa nem tira o próprio perfil; inativo não recebe convite', () => {
    const { atender, admin } = servidorComCaixa();
    const eu = atender({ metodo: 'get', url: '/me', authorization: admin }).data;
    expect(atender({ metodo: 'post', url: `/users/${eu.id}/deactivate`, authorization: admin }).data).toMatchObject({
      status: 409,
      message: 'Você não pode desativar a sua própria conta',
    });
    expect(
      atender({ metodo: 'put', url: `/users/${eu.id}`, authorization: admin, corpo: { nome: eu.nome, perfil: 'PASTOR' } }).data,
    ).toMatchObject({ status: 409, message: 'Você não pode remover o seu próprio perfil de Administrador' });

    const { data: criado } = atender({
      metodo: 'post',
      url: '/users',
      authorization: admin,
      corpo: { nome: 'Novo', email: 'novo@igreja.org', perfil: 'MEMBRO' },
    });
    atender({ metodo: 'post', url: `/users/${criado.id}/deactivate`, authorization: admin });
    expect(atender({ metodo: 'post', url: `/users/${criado.id}/invite`, authorization: admin }).data.message).toBe(
      'Ative o usuário antes de reenviar o convite',
    );
    expect(atender({ metodo: 'post', url: `/users/${criado.id}/activate`, authorization: admin }).data.ativo).toBe(true);
  });

  it('id inexistente é 404 e id que não é UUID é 400', () => {
    const { atender, admin } = servidorComCaixa();
    expect(atender({ metodo: 'get', url: '/users/00000000-0000-4000-8000-000000000999', authorization: admin }).status).toBe(404);
    expect(atender({ metodo: 'post', url: '/users/abc/activate', authorization: admin }).status).toBe(400);
  });
});
