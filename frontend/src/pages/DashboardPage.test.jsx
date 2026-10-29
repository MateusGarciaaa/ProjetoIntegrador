// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PERFIS } from '../constants/perfis';
import { descreverPeriodo, periodoPadrao } from '../schemas/consultaFinanceiro';
import { agoraDoServidor } from '../schemas/regrasEvento';
import { CONTAS_DEMO, SENHA_DEMO } from '../services/mock/contasDemo';
import { criarServidorSimulado } from '../services/mock/servidorSimulado';
import { abrirApp } from '../test-utils/app';
import { corpoApi, instalarTransporte, resposta, transporteDoServidor } from '../test-utils/transporte';

const MES = periodoPadrao(agoraDoServidor().data);
const TITULOS = Object.freeze({
  financeiro: `Financeiro — ${descreverPeriodo(MES)}`,
  membros: 'Membros',
  eventos: 'Próximos eventos',
  aniversariantes: 'Aniversariantes do mês',
  novos: 'Novos membros',
  serie: 'Receitas × despesas por mês',
  categorias: 'Despesas por categoria no mês',
});

let transporte;

afterEach(() => {
  transporte?.restaurar();
  transporte = null;
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

/**
 * Abre o Painel logado no perfil, com o servidor simulado respondendo. falhas: Set de URLs que
 * respondem 500 (pode mudar durante o teste, para simular a volta do servidor); alterarDashboard:
 * troca o corpo do GET /dashboard (ex.: o backend deixar de mandar um bloco).
 */
function abrirPainel(perfil, { falhas = new Set(), alterarDashboard } = {}) {
  const atender = criarServidorSimulado({ validadeTokenSegundos: 3600 });
  const conta = CONTAS_DEMO.find((c) => c.perfil === perfil);
  const { data } = atender({
    metodo: 'post',
    url: '/auth/login',
    corpo: { email: conta.email, password: SENHA_DEMO },
  });
  const doServidor = transporteDoServidor(atender);
  transporte = instalarTransporte(async (config) => {
    if (falhas.has(config.url)) return resposta(500, corpoApi(500, 'Ocorreu um erro interno no servidor.', config.url))(config);
    const saida = await doServidor(config);
    return alterarDashboard && config.url === '/dashboard' ? { ...saida, data: alterarDashboard(saida.data) } : saida;
  });
  abrirApp('/dashboard', perfil, { token: data.token });
  return { falhas };
}

const blocos = () => screen.queryAllByRole('heading', { level: 2 }).map((h) => h.textContent);
const blocoDe = (titulo) => screen.getByRole('heading', { level: 2, name: titulo }).closest('section');
const pedidos = () => transporte.adapter.mock.calls.map(([config]) => config.url);
const pedidosFinanceiros = () => pedidos().filter((url) => url.startsWith('/financial'));

/** Espera o Painel terminar de carregar (nenhum bloco ocupado). */
async function aguardarCarregar() {
  await screen.findByRole('heading', { level: 1, name: 'Painel' }, { timeout: 5000 });
  await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull(), { timeout: 5000 });
}

describe('Painel: o que cada perfil vê (RN12)', () => {
  it('ADMINISTRADOR vê todos os blocos, com os totais do mês somados no backend', async () => {
    abrirPainel(PERFIS.ADMINISTRADOR);
    await aguardarCarregar();
    expect(blocos()).toEqual(Object.values(TITULOS));
    const financeiro = blocoDe(TITULOS.financeiro);
    expect(
      within(financeiro).getByRole('link', {
        name: /Receitas\s*R\$\s*4\.097,90/,
      }),
    ).toBeTruthy();
    expect(
      within(financeiro).getByRole('link', {
        name: /Despesas\s*R\$\s*2\.328,50/,
      }),
    ).toBeTruthy();
    expect(within(financeiro).getByRole('link', { name: /Saldo\s*R\$\s*1\.769,40/ })).toBeTruthy();
    expect(
      within(blocoDe(TITULOS.membros)).getByRole('meter', {
        name: 'Membros ativos',
      }),
    ).toBeTruthy();
    expect(
      within(blocoDe(TITULOS.serie)).getByRole('img', {
        name: /receitas e despesas por mês/i,
      }),
    ).toBeTruthy();
    expect(
      within(blocoDe(TITULOS.categorias)).getByRole('list', {
        name: /Despesas por categoria/,
      }),
    ).toBeTruthy();
  });

  it('PASTOR vê o mesmo que o administrador, inclusive o financeiro (ele consulta o Financeiro)', async () => {
    abrirPainel(PERFIS.PASTOR);
    await aguardarCarregar();
    expect(blocos()).toEqual(Object.values(TITULOS));
  });

  it('SECRETARIO: membros, eventos e aniversariantes; nada financeiro, nem "R$ 0,00"', async () => {
    abrirPainel(PERFIS.SECRETARIO);
    await aguardarCarregar();
    expect(blocos()).toEqual([TITULOS.membros, TITULOS.eventos, TITULOS.aniversariantes, TITULOS.novos]);
    expect(screen.queryByText(/R\$/)).toBeNull();
    expect(pedidosFinanceiros()).toEqual([]);
  });

  it('TESOUREIRO: financeiro e eventos; nada de membros nem aniversariantes', async () => {
    abrirPainel(PERFIS.TESOUREIRO);
    await aguardarCarregar();
    expect(blocos()).toEqual([TITULOS.financeiro, TITULOS.eventos, TITULOS.serie, TITULOS.categorias]);
    expect(screen.queryByRole('meter')).toBeNull();
  });

  it('MEMBRO: só os próximos eventos; nenhuma consulta ao financeiro', async () => {
    abrirPainel(PERFIS.MEMBRO);
    await aguardarCarregar();
    expect(blocos()).toEqual([TITULOS.eventos]);
    expect(screen.queryByText(/R\$/)).toBeNull();
    expect(pedidosFinanceiros()).toEqual([]);
  });

  it('bloco que o backend mandou null some, mesmo que a permissão local deixasse', async () => {
    abrirPainel(PERFIS.ADMINISTRADOR, {
      alterarDashboard: (corpo) => ({
        ...corpo,
        totalMembros: null,
        membrosAtivos: null,
        aniversariantesDoMes: null,
      }),
    });
    await aguardarCarregar();
    expect(blocos()).not.toContain(TITULOS.membros);
    expect(blocos()).not.toContain(TITULOS.aniversariantes);
    expect(blocos()).toContain(TITULOS.novos);
    expect(blocos()).toContain(TITULOS.eventos);
  });
});

describe('Painel: membros por status e novos membros', () => {
  it('mostra total, ativos, afastados e visitantes do backend, cada um levando à lista filtrada', async () => {
    abrirPainel(PERFIS.SECRETARIO, {
      alterarDashboard: (corpo) => ({ ...corpo, totalMembros: 25, membrosAtivos: 16, membrosAfastados: 5, membrosVisitantes: 4 }),
    });
    await aguardarCarregar();
    const membros = blocoDe(TITULOS.membros);
    const contagem = (rotulo) => within(membros).getByRole('link', { name: new RegExp(`^${rotulo}`) });
    expect(contagem('Total').textContent).toContain('25');
    expect(contagem('Ativos').textContent).toContain('16');
    expect(contagem('Afastados').textContent).toContain('5');
    expect(contagem('Visitantes').textContent).toContain('4');
    expect(contagem('Total').getAttribute('href')).toBe('/membros');
    expect(contagem('Afastados').getAttribute('href')).toBe('/membros?status=AFASTADO');
    expect(contagem('Visitantes').getAttribute('href')).toBe('/membros?status=VISITANTE');
    expect(within(membros).getByText('64% dos membros estão ativos')).toBeTruthy();
  });

  it('novos membros: os da carga, com data e status, cada um levando à ficha', async () => {
    abrirPainel(PERFIS.PASTOR);
    await aguardarCarregar();
    const novos = blocoDe(TITULOS.novos);
    expect(within(novos).getByText('3 cadastros nos últimos 30 dias')).toBeTruthy();
    const links = within(novos).getAllByRole('link');
    expect(links).toHaveLength(3);
    links.forEach((link) => {
      expect(link.getAttribute('href')).toMatch(/^\/membros\/[0-9a-f-]{36}$/);
      expect(link.textContent).toMatch(/Cadastrado em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
      expect(link.textContent).toMatch(/Ativo|Afastado|Visitante/);
    });
  });

  it('lista limitada pelo backend: avisa quantos são ao todo', async () => {
    abrirPainel(PERFIS.ADMINISTRADOR, { alterarDashboard: (corpo) => ({ ...corpo, totalNovosMembros: 12 }) });
    await aguardarCarregar();
    expect(within(blocoDe(TITULOS.novos)).getByText('12 cadastros nos últimos 30 dias (mostrando os 3 mais recentes)')).toBeTruthy();
  });

  it('nenhum novo membro: mensagem, sem lista', async () => {
    abrirPainel(PERFIS.SECRETARIO, { alterarDashboard: (corpo) => ({ ...corpo, novosMembros: [], totalNovosMembros: 0 }) });
    await aguardarCarregar();
    const novos = blocoDe(TITULOS.novos);
    expect(within(novos).getByText('Nenhum membro cadastrado nos últimos 30 dias.')).toBeTruthy();
    expect(within(novos).queryByRole('list')).toBeNull();
  });

  it('TESOUREIRO e MEMBRO não veem novos membros nem contagens', async () => {
    for (const perfil of [PERFIS.TESOUREIRO, PERFIS.MEMBRO]) {
      abrirPainel(perfil);
      await aguardarCarregar();
      expect(blocos()).not.toContain(TITULOS.novos);
      expect(screen.queryByText(/Afastados|Visitantes/)).toBeNull();
      cleanup();
      transporte.restaurar();
    }
  });
});

describe('Painel: atalhos para as telas', () => {
  it('cada evento leva aos detalhes; os blocos levam à agenda, às movimentações, ao fluxo e ao relatório', async () => {
    abrirPainel(PERFIS.ADMINISTRADOR);
    await aguardarCarregar();
    const eventos = blocoDe(TITULOS.eventos);
    const links = within(eventos).getAllByRole('link');
    expect(links[0].getAttribute('href')).toBe('/eventos');
    expect(links.slice(1).length).toBeGreaterThan(0);
    links.slice(1).forEach((link) => expect(link.getAttribute('href')).toMatch(/^\/eventos\/[0-9a-f-]{36}$/));

    const financeiro = blocoDe(TITULOS.financeiro);
    expect(
      within(financeiro)
        .getByRole('link', { name: /^Receitas/ })
        .getAttribute('href'),
    ).toBe('/financeiro?tipo=RECEITA');
    expect(
      within(financeiro)
        .getByRole('link', { name: /^Despesas/ })
        .getAttribute('href'),
    ).toBe('/financeiro?tipo=DESPESA');
    expect(
      within(financeiro)
        .getByRole('link', { name: /^Saldo/ })
        .getAttribute('href'),
    ).toBe('/financeiro/fluxo-de-caixa');
    expect(within(blocoDe(TITULOS.serie)).getByRole('link', { name: 'Ver fluxo de caixa' }).getAttribute('href')).toMatch(
      /^\/financeiro\/fluxo-de-caixa\?de=\d{4}-\d{2}-01&ate=/,
    );
    expect(within(blocoDe(TITULOS.categorias)).getByRole('link', { name: 'Ver relatório' }).getAttribute('href')).toBe(
      '/financeiro/relatorio',
    );
    expect(
      within(blocoDe(TITULOS.membros))
        .getByRole('link', { name: /^Ativos/ })
        .getAttribute('href'),
    ).toBe('/membros?status=ATIVO');
  });

  it('clicar num evento abre os detalhes dele', async () => {
    abrirPainel(PERFIS.MEMBRO);
    await aguardarCarregar();
    const [, primeiro] = within(blocoDe(TITULOS.eventos)).getAllByRole('link');
    const titulo = primeiro.querySelector('span').textContent;
    fireEvent.click(primeiro);
    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeTruthy();
  });

  it('pede a série dos últimos 6 meses por mês e as despesas do mês por categoria', async () => {
    abrirPainel(PERFIS.TESOUREIRO);
    await aguardarCarregar();
    const configs = transporte.adapter.mock.calls.map(([config]) => config);
    const serie = configs.find((c) => c.url === '/financial/summary/series');
    expect(serie.params).toMatchObject({
      dataFim: MES.ate,
      agrupamento: 'MES',
    });
    expect(serie.params.dataInicio).toMatch(/-01$/);
    expect(configs.find((c) => c.url === '/financial/summary/categories').params).toEqual({
      dataInicio: MES.de,
      dataFim: MES.ate,
      tipo: 'DESPESA',
    });
    expect(configs.find((c) => c.url === '/financial/summary').params).toEqual({
      dataInicio: MES.de,
      dataFim: MES.ate,
    });
    // Nada de buscar lançamentos ou membros para contar no navegador.
    expect(pedidos()).not.toContain('/financial');
    expect(pedidos()).not.toContain('/members');
  });
});

describe('Painel: a falha de um bloco não derruba os outros', () => {
  it('/dashboard fora do ar: membros, eventos e aniversariantes mostram o erro; o financeiro segue', async () => {
    const { falhas } = abrirPainel(PERFIS.ADMINISTRADOR, {
      falhas: new Set(['/dashboard']),
    });
    await aguardarCarregar();
    for (const titulo of [TITULOS.membros, TITULOS.eventos, TITULOS.aniversariantes, TITULOS.novos]) {
      expect(within(blocoDe(titulo)).getByRole('alert').textContent).toContain('Não foi possível carregar');
    }
    expect(within(blocoDe(TITULOS.financeiro)).queryByRole('alert')).toBeNull();
    expect(within(blocoDe(TITULOS.financeiro)).getByText(/4\.097,90/)).toBeTruthy();
    expect(within(blocoDe(TITULOS.serie)).getByRole('img')).toBeTruthy();

    // O servidor volta: "Tentar novamente" recarrega só a consulta do /dashboard.
    falhas.clear();
    const antes = pedidosFinanceiros().length;
    fireEvent.click(
      within(blocoDe(TITULOS.eventos)).getByRole('button', {
        name: 'Tentar novamente',
      }),
    );
    await waitFor(() => expect(within(blocoDe(TITULOS.eventos)).queryByRole('alert')).toBeNull());
    expect(within(blocoDe(TITULOS.eventos)).getAllByRole('link').length).toBeGreaterThan(1);
    expect(pedidosFinanceiros().length).toBe(antes);
  });

  it('série fora do ar: só o gráfico mostra o erro; cartões e categorias seguem', async () => {
    abrirPainel(PERFIS.TESOUREIRO, {
      falhas: new Set(['/financial/summary/series']),
    });
    await aguardarCarregar();
    expect(within(blocoDe(TITULOS.serie)).getByRole('alert')).toBeTruthy();
    expect(within(blocoDe(TITULOS.financeiro)).queryByRole('alert')).toBeNull();
    expect(within(blocoDe(TITULOS.categorias)).queryByRole('alert')).toBeNull();
    expect(within(blocoDe(TITULOS.eventos)).queryByRole('alert')).toBeNull();
  });

  it('resumo do mês fora do ar: só os cartões financeiros mostram o erro', async () => {
    abrirPainel(PERFIS.PASTOR, { falhas: new Set(['/financial/summary']) });
    await aguardarCarregar();
    expect(within(blocoDe(TITULOS.financeiro)).getByRole('alert')).toBeTruthy();
    for (const titulo of [TITULOS.membros, TITULOS.eventos, TITULOS.aniversariantes, TITULOS.novos, TITULOS.serie, TITULOS.categorias]) {
      expect(within(blocoDe(titulo)).queryByRole('alert')).toBeNull();
    }
  });

  it('erro de renderização num bloco fica preso nele', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    abrirPainel(PERFIS.SECRETARIO, {
      alterarDashboard: (corpo) => ({
        ...corpo,
        aniversariantesDoMes: [{ id: 'x', nome: 'Sem data', dataNascimento: null }],
      }),
    });
    await aguardarCarregar();
    expect(within(blocoDe(TITULOS.aniversariantes)).getByRole('alert')).toBeTruthy();
    expect(within(blocoDe(TITULOS.membros)).queryByRole('alert')).toBeNull();
    expect(within(blocoDe(TITULOS.eventos)).queryByRole('alert')).toBeNull();
  });
});
