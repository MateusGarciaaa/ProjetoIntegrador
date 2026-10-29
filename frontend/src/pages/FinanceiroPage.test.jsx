// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PERFIS } from '../constants/perfis';
import { periodoPadrao } from '../schemas/consultaFinanceiro';
import { agoraDoServidor } from '../schemas/regrasEvento';
import { abrirAppComServidor } from '../test-utils/app';

/** O Intl separa "R$" do número com espaço não separável (U+00A0). */
const reais = (texto) => texto.replace(' ', ' ');
const MES = periodoPadrao(agoraDoServidor().data);

let transporte;

afterEach(() => {
  transporte?.restaurar();
  transporte = null;
  window.sessionStorage.clear();
});

function abrir(caminho, perfil, opcoes) {
  const aberto = abrirAppComServidor(caminho, perfil, opcoes);
  transporte = aberto.transporte;
  return aberto;
}

const tabela = () => screen.getByRole('table', { name: 'Movimentações' });
const descricoes = () => within(tabela()).getAllByRole('rowheader').map((celula) => celula.textContent);
const linhaDa = (descricao) => within(tabela()).getAllByRole('rowheader', { name: descricao })[0].closest('tr');
const chamadas = (metodo) => transporte.adapter.mock.calls.map(([config]) => config).filter((c) => c.method === metodo);
const pedidosDaLista = () => chamadas('get').filter((c) => c.url === '/financial');

async function abrirLista(perfil, caminho = '/financeiro') {
  const aberto = abrir(caminho, perfil);
  await screen.findByRole('table', { name: 'Movimentações' }, { timeout: 5000 });
  return aberto;
}

describe('movimentações: listagem', () => {
  it('pede ao servidor o mês atual (São Paulo), 10 por página, das mais recentes para as mais antigas', async () => {
    await abrirLista(PERFIS.TESOUREIRO);
    const [lista] = pedidosDaLista();
    expect(lista.params).toEqual({ dataInicio: MES.de, dataFim: MES.ate, page: 0, size: 10, sort: ['data,desc', 'id,desc'] });
    // 11 lançamentos de demonstração no mês: a 1ª página traz 10.
    expect(descricoes()).toHaveLength(10);
    expect(screen.getByText('Mostrando 1–10 de 11')).toBeTruthy();
    expect(screen.getByText('11 movimentações')).toBeTruthy();
  });

  it('a paginação é do servidor: a 2ª página pede page=1 e mostra o 11º lançamento', async () => {
    const { localizacao } = await abrirLista(PERFIS.TESOUREIRO);
    fireEvent.click(screen.getByRole('button', { name: /Próxima/ }));
    await waitFor(() => expect(descricoes()).toHaveLength(1));
    expect(localizacao.atual.search).toBe('?pagina=2');
    expect(pedidosDaLista().at(-1).params).toMatchObject({ page: 1, size: 10 });
    expect(screen.getByText('Mostrando 11–11 de 11')).toBeTruthy();
  });

  it('?pagina= além da última vai para a última que existe', async () => {
    const { localizacao } = await abrirLista(PERFIS.TESOUREIRO, '/financeiro?pagina=9');
    await waitFor(() => expect(localizacao.atual.search).toBe('?pagina=2'));
    await waitFor(() => expect(descricoes()).toHaveLength(1));
  });

  it('valor em BRL com sinal e tipo por texto e ícone, não só por cor', async () => {
    await abrirLista(PERFIS.PASTOR);
    const jantar = linhaDa('Jantar beneficente');
    expect(within(jantar).getByText('Receita')).toBeTruthy();
    // Sinal visível + rótulo para leitor de tela + valor.
    expect(jantar.textContent).toMatch(/\+ Receita: R\$\s1\.250,00/);
    const energia = linhaDa('Conta de energia elétrica');
    expect(within(energia).getByText('Despesa')).toBeTruthy();
    expect(energia.textContent).toMatch(/− Despesa: R\$\s486,32/);
    expect(energia.querySelector('svg')).toBeTruthy();
  });

  it('filtra por tipo e por categoria no servidor, guardando na URL', async () => {
    const { localizacao } = await abrirLista(PERFIS.TESOUREIRO);
    expect(screen.getByText('Receitas: R$ 4.097,90')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'DESPESA' } });
    await waitFor(() => expect(descricoes()).toHaveLength(4));
    expect(localizacao.atual.search).toBe('?tipo=DESPESA');
    expect(pedidosDaLista().at(-1).params).toMatchObject({ dataInicio: MES.de, dataFim: MES.ate, tipo: 'DESPESA', page: 0 });
    expect(pedidosDaLista().at(-1).params).not.toHaveProperty('categoriaId');
    // Totais do /summary do período: com filtro de tipo, só o daquele tipo.
    expect(screen.getByText('Despesas: R$ 2.328,50')).toBeTruthy();
    expect(screen.queryByText(/^Receitas:/)).toBeNull();
    // Só as categorias de despesa aparecem no filtro.
    const opcoes = within(screen.getByLabelText('Categoria')).getAllByRole('option').map((o) => o.textContent);
    expect(opcoes).toEqual(['Todas as categorias', 'Ação social', 'Água e energia', 'Manutenção']);

    const AGUA_E_ENERGIA = '3a9d2b1c-6e4f-4a8b-9c2d-000000000004';
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: AGUA_E_ENERGIA } });
    await waitFor(() => expect(descricoes().sort()).toEqual(['Conta de energia elétrica', 'Conta de água'].sort()));
    expect(pedidosDaLista().at(-1).params).toMatchObject({ tipo: 'DESPESA', categoriaId: AGUA_E_ENERGIA });
    // O summary recebe os mesmos filtros: o total passa a ser o da categoria.
    expect(screen.getByText('2 movimentações')).toBeTruthy();
    const resumos = chamadas('get').filter((c) => c.url === '/financial/summary');
    expect(resumos.at(-1).params).toEqual({ dataInicio: MES.de, dataFim: MES.ate, tipo: 'DESPESA', categoriaId: AGUA_E_ENERGIA });
    await waitFor(() => expect(screen.getByText(/^Despesas: /).textContent).not.toBe('Despesas: R$ 2.328,50'));
    expect(screen.queryByText(/^Receitas:/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await waitFor(() => expect(descricoes()).toHaveLength(10));
  });

  it('o período vai para a URL e para a consulta (mês anterior)', async () => {
    const { localizacao } = await abrirLista(PERFIS.ADMINISTRADOR);
    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    await waitFor(() => expect(localizacao.atual.search).toMatch(/^\?de=\d{4}-\d{2}-01&ate=\d{4}-\d{2}-\d{2}$/));
    const ultima = pedidosDaLista().at(-1);
    expect(ultima.params.dataInicio).not.toBe(MES.de);
    await waitFor(() => expect(screen.getByText('11 movimentações')).toBeTruthy());
  });
});

describe('movimentações: ações por perfil', () => {
  it('ADMINISTRADOR: nova, editar e excluir', async () => {
    await abrirLista(PERFIS.ADMINISTRADOR);
    expect(screen.getByRole('link', { name: 'Nova movimentação' })).toBeTruthy();
    const linha = linhaDa('Jantar beneficente');
    expect(within(linha).getByRole('link', { name: /^Editar Jantar beneficente/ })).toBeTruthy();
    expect(within(linha).getByRole('button', { name: /^Excluir Jantar beneficente/ })).toBeTruthy();
  });

  it('TESOUREIRO: nova e editar, sem excluir (DELETE é só do administrador)', async () => {
    await abrirLista(PERFIS.TESOUREIRO);
    expect(screen.getByRole('link', { name: 'Nova movimentação' })).toBeTruthy();
    const linha = linhaDa('Jantar beneficente');
    expect(within(linha).getByRole('link', { name: /^Editar/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Excluir/ })).toBeNull();
  });

  it('PASTOR: só consulta (sem nova, editar nem excluir)', async () => {
    await abrirLista(PERFIS.PASTOR);
    expect(screen.queryByRole('link', { name: 'Nova movimentação' })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Editar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Excluir/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Fluxo de caixa' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Relatório' })).toBeTruthy();
  });

  it('exclusão confirmada pelo administrador some da lista', async () => {
    await abrirLista(PERFIS.ADMINISTRADOR);
    fireEvent.click(within(linhaDa('Jantar beneficente')).getByRole('button', { name: /^Excluir/ }));
    const dialogo = await screen.findByRole('dialog', { name: 'Excluir movimentação' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir movimentação' }));

    await waitFor(() => expect(screen.getByText('10 movimentações')).toBeTruthy());
    expect(within(tabela()).queryByRole('rowheader', { name: 'Jantar beneficente' })).toBeNull();
    expect(chamadas('delete')).toHaveLength(1);
  });
});

describe('fluxo de caixa e relatório', () => {
  it('fluxo de caixa: totais do /summary e gráfico por dia com a tabela dos valores', async () => {
    abrir('/financeiro/fluxo-de-caixa', PERFIS.PASTOR);
    expect(await screen.findByText('R$ 4.097,90', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText('R$ 2.328,50')).toBeTruthy();
    expect(screen.getByText('R$ 1.769,40')).toBeTruthy();
    expect(await screen.findByRole('img', { name: /receitas e despesas por dia/i })).toBeTruthy();
    expect(screen.getByText('Ver os valores em tabela')).toBeTruthy();
    const resumo = chamadas('get').find((c) => c.url === '/financial/summary');
    expect(resumo.params).toEqual({ dataInicio: MES.de, dataFim: MES.ate });
    // A série vem somada do backend; a lista de lançamentos nem é pedida.
    const serie = chamadas('get').find((c) => c.url === '/financial/summary/series');
    expect(serie.params).toEqual({ dataInicio: MES.de, dataFim: MES.ate, agrupamento: 'DIA' });
    expect(pedidosDaLista()).toHaveLength(0);
  });

  it('relatório: totais por categoria, lançamentos e botão de imprimir (sem exportação)', async () => {
    abrir('/financeiro/relatorio', PERFIS.PASTOR);
    expect(await screen.findByRole('heading', { name: /^Relatório financeiro — / }, { timeout: 5000 })).toBeTruthy();
    const receitas = screen.getByRole('heading', { name: 'Receitas por categoria' }).closest('section');
    const linhaDizimos = within(receitas).getByRole('rowheader', { name: 'Dízimos' }).closest('tr');
    // 450 + 320 + 600 + 275,50 = 1.645,50 de 4.097,90.
    expect(linhaDizimos.textContent).toContain(reais('R$ 1.645,50'));
    expect(linhaDizimos.textContent).toContain('40,2%');
    expect(screen.getByRole('heading', { name: 'Lançamentos (11)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /exportar/i })).toBeNull();
    // Somas por categoria vêm do backend (GROUP BY), não da lista.
    const porCategoria = chamadas('get').find((c) => c.url === '/financial/summary/categories');
    expect(porCategoria.params).toEqual({ dataInicio: MES.de, dataFim: MES.ate });
  });
});

describe('período com mais lançamentos do que cabe numa página (2000 do Spring)', () => {
  const DIZIMOS = '3a9d2b1c-6e4f-4a8b-9c2d-000000000001';

  /** +2000 receitas de R$ 1,00 no 1º dia do mês: 2.011 no período, mais do que uma página de 2000. */
  function lancarEmMassa(atender, authorization) {
    for (let i = 0; i < 2000; i += 1) {
      const corpo = { descricao: `Oferta ${i}`, valor: 1, data: MES.de, tipo: 'RECEITA', categoriaId: DIZIMOS, membroId: null };
      expect(atender({ metodo: 'post', url: '/financial', authorization, corpo }).status).toBe(201);
    }
  }

  it('fluxo de caixa: totais e gráfico certos, sem aviso de limite (tudo somado no banco)', async () => {
    abrir('/financeiro/fluxo-de-caixa', PERFIS.TESOUREIRO, { preparar: lancarEmMassa });
    // 4.097,90 + 2.000,00.
    expect(await screen.findByText('R$ 6.097,90', {}, { timeout: 5000 })).toBeTruthy();
    expect(await screen.findByRole('img', { name: /receitas e despesas por dia/i })).toBeTruthy();
    expect(screen.queryByText(/reduza o período/)).toBeNull();
  });

  it('relatório: somas por categoria do backend e todos os lançamentos, página a página', async () => {
    abrir('/financeiro/relatorio', PERFIS.TESOUREIRO, { preparar: lancarEmMassa });
    expect(await screen.findByRole('heading', { name: 'Lançamentos (2011)' }, { timeout: 10000 })).toBeTruthy();
    const receitas = screen.getByRole('heading', { name: 'Receitas por categoria' }).closest('section');
    // 1.645,50 + 2.000,00.
    expect(within(receitas).getByRole('rowheader', { name: 'Dízimos' }).closest('tr').textContent).toContain(reais('R$ 3.645,50'));
    expect(pedidosDaLista().map((c) => c.params.page)).toEqual([0, 1]);
    expect(screen.getByRole('button', { name: 'Imprimir' }).disabled).toBe(false);
    expect(screen.queryByText(/reduza o período/)).toBeNull();
  });
});
