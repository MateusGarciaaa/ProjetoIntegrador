// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PERFIS } from '../constants/perfis';
import { abrirApp, abrirAppComServidor } from '../test-utils/app';
import { instalarTransporte } from '../test-utils/transporte';

let transporte;

afterEach(() => {
  transporte?.restaurar();
  transporte = null;
  window.sessionStorage.clear();
});

function abrir(caminho, perfil = PERFIS.SECRETARIO) {
  const aberto = abrirAppComServidor(caminho, perfil);
  transporte = aberto.transporte;
  return aberto;
}

/** Parâmetros das chamadas GET /members feitas até agora. */
function consultasDeMembros() {
  return transporte.adapter.mock.calls.map(([config]) => config).filter((c) => c.url === '/members').map((c) => c.params);
}

const tabela = () => screen.getByRole('table', { name: 'Membros cadastrados' });
const nomesNaTabela = () => within(tabela()).getAllByRole('rowheader').map((celula) => celula.textContent);
const esperarLista = () => screen.findByRole('table', { name: 'Membros cadastrados' });

describe('listagem de membros: paginação', () => {
  it('mostra 10 por página, ordenados por nome, e a próxima página vai para a URL', async () => {
    const { localizacao } = abrir('/membros');
    await esperarLista();
    expect(nomesNaTabela()).toHaveLength(10);
    expect(nomesNaTabela()[0]).toBe('Ana Beatriz Carvalho');
    expect(screen.getByText('Mostrando 1–10 de 25')).toBeTruthy();
    expect(consultasDeMembros()[0]).toEqual({ page: 0, size: 10, sort: ['nome,asc', 'id,asc'] });

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    await screen.findByText('Mostrando 11–20 de 25');
    expect(consultasDeMembros().at(-1)).toMatchObject({ page: 1 });
    expect(localizacao.atual.search).toBe('?pagina=2');
  });

  it('restaura página e ordenação da URL (F5)', async () => {
    abrir('/membros?pagina=3&ordem=nome,desc');
    await screen.findByText('Mostrando 21–25 de 25');
    expect(consultasDeMembros()[0]).toEqual({ page: 2, size: 10, sort: ['nome,desc', 'id,asc'] });
    expect(nomesNaTabela().at(-1)).toBe('Ana Beatriz Carvalho');
  });

  it('página além da última na URL volta para a última que existe', async () => {
    const { localizacao } = abrir('/membros?pagina=9');
    await screen.findByText('Mostrando 21–25 de 25');
    expect(localizacao.atual.search).toBe('?pagina=3');
  });
});

describe('listagem de membros: pesquisa, filtro e ordenação', () => {
  it('pesquisa por nome com espera: uma só busca ao parar de digitar, voltando à 1ª página', async () => {
    const { localizacao } = abrir('/membros?pagina=2');
    await esperarLista();
    const busca = screen.getByRole('searchbox', { name: 'Buscar membros por nome' });

    fireEvent.change(busca, { target: { value: 'l' } });
    fireEvent.change(busca, { target: { value: 'lu' } });

    await waitFor(() => expect(localizacao.atual.search).toBe('?busca=lu'));
    await waitFor(() => expect(nomesNaTabela()).toEqual(['André Luiz Fontana', 'Fernanda Luz Almeida', 'Lucas Moraes Teixeira', 'Luíza Bernardes']));
    const nomesBuscados = consultasDeMembros().map((params) => params.nome);
    expect(nomesBuscados).toEqual([undefined, 'lu']);
    expect(consultasDeMembros().at(-1).page).toBe(0);
  });

  it('busca da URL preenche o campo', async () => {
    abrir('/membros?busca=lu');
    await esperarLista();
    expect(screen.getByRole('searchbox', { name: 'Buscar membros por nome' }).value).toBe('lu');
    expect(consultasDeMembros()[0].nome).toBe('lu');
  });

  it('filtra por status no servidor (?status=) e guarda na URL', async () => {
    const { localizacao } = abrir('/membros');
    await esperarLista();

    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'VISITANTE' } });

    await waitFor(() => expect(nomesNaTabela()).toEqual(['Bruna Kessler', 'Fernanda Luz Almeida', 'Isadora Pacheco', 'Rafael Siqueira']));
    expect(localizacao.atual.search).toBe('?status=VISITANTE');
    expect(consultasDeMembros().at(-1)).toEqual({ status: 'VISITANTE', page: 0, size: 10, sort: ['nome,asc', 'id,asc'] });
    expect(screen.getByText('Mostrando 1–4 de 4')).toBeTruthy();
  });

  it('ordena ao clicar no cabeçalho e inverte no segundo clique', async () => {
    const { localizacao } = abrir('/membros');
    await esperarLista();
    const cabecalhoEmail = () => within(tabela()).getByRole('columnheader', { name: 'E-mail' });

    fireEvent.click(within(cabecalhoEmail()).getByRole('button'));
    await waitFor(() => expect(localizacao.atual.search).toBe('?ordem=email%2Casc'));
    await waitFor(() => expect(cabecalhoEmail().getAttribute('aria-sort')).toBe('ascending'));
    expect(consultasDeMembros().at(-1).sort).toEqual(['email,asc', 'nome,asc', 'id,asc']);

    fireEvent.click(within(cabecalhoEmail()).getByRole('button'));
    await waitFor(() => expect(cabecalhoEmail().getAttribute('aria-sort')).toBe('descending'));
    expect(consultasDeMembros().at(-1).sort).toEqual(['email,desc', 'nome,asc', 'id,asc']);
    expect(nomesNaTabela()[0]).toBe('Vitória Campos Reis');
  });

  it('sem resultado com filtro: estado vazio e "Limpar filtros" limpa a URL', async () => {
    const { localizacao } = abrir('/membros?busca=zzz&status=ATIVO');
    expect(await screen.findByRole('heading', { name: 'Nenhum membro encontrado' })).toBeTruthy();
    expect(screen.getByText(/“zzz” no nome e com status Ativo/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    await esperarLista();
    expect(localizacao.atual.search).toBe('');
    expect(screen.getByRole('searchbox', { name: 'Buscar membros por nome' }).value).toBe('');
  });

  it('mostra o esqueleto enquanto carrega', async () => {
    transporte = instalarTransporte(() => new Promise(() => {}));
    abrirApp('/membros', PERFIS.PASTOR);
    expect(await screen.findByText('Carregando membros…')).toBeTruthy();
  });
});

describe('listagem de membros: botões por perfil', () => {
  async function botoes(perfil) {
    abrir('/membros', perfil);
    await esperarLista();
    return {
      novo: screen.queryByRole('link', { name: 'Novo membro' }),
      editar: screen.queryAllByRole('link', { name: 'Editar Ana Beatriz Carvalho' }),
      excluir: screen.queryAllByRole('button', { name: 'Excluir Ana Beatriz Carvalho' }),
    };
  }

  it('ADMINISTRADOR cria, edita e exclui', async () => {
    const { novo, editar, excluir } = await botoes(PERFIS.ADMINISTRADOR);
    expect(novo).toBeTruthy();
    expect(editar.length).toBeGreaterThan(0);
    expect(excluir.length).toBeGreaterThan(0);
  });

  it('SECRETARIO cria e edita, mas não exclui', async () => {
    const { novo, editar, excluir } = await botoes(PERFIS.SECRETARIO);
    expect(novo).toBeTruthy();
    expect(editar.length).toBeGreaterThan(0);
    expect(excluir).toHaveLength(0);
  });

  it('PASTOR só consulta: nem criar, nem editar, nem excluir (e sem coluna de ações)', async () => {
    const { novo, editar, excluir } = await botoes(PERFIS.PASTOR);
    expect(novo).toBeNull();
    expect(editar).toHaveLength(0);
    expect(excluir).toHaveLength(0);
    expect(within(tabela()).getAllByRole('columnheader')).toHaveLength(4);
    // O nome continua levando aos detalhes.
    expect(within(tabela()).getByRole('link', { name: 'Ana Beatriz Carvalho' }).getAttribute('href')).toMatch(/^\/membros\/[0-9a-f-]+$/);
  });
});

describe('exclusão pela lista', () => {
  it('confirma com o nome do membro, exclui e recarrega', async () => {
    abrir('/membros', PERFIS.ADMINISTRADOR);
    await esperarLista();

    fireEvent.click(within(tabela()).getByRole('button', { name: 'Excluir Bruna Kessler' }));
    const dialogo = screen.getByRole('dialog', { name: 'Excluir membro' });
    expect(dialogo.textContent).toContain('Excluir Bruna Kessler do cadastro?');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir membro' }));

    expect(await screen.findByText('Membro excluído.')).toBeTruthy();
    await waitFor(() => expect(nomesNaTabela()).not.toContain('Bruna Kessler'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('RN14: membro com histórico financeiro não é excluído e o diálogo explica o motivo', async () => {
    abrir('/membros', PERFIS.ADMINISTRADOR);
    await esperarLista();

    fireEvent.click(within(tabela()).getByRole('button', { name: 'Excluir Ana Beatriz Carvalho' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir membro' }));

    const bloqueio = await screen.findByRole('dialog', { name: 'Não é possível excluir' });
    expect(bloqueio.textContent).toContain('possui movimentações financeiras vinculadas');
    expect(within(bloqueio).getByRole('link', { name: 'Alterar status' }).getAttribute('href')).toMatch(/\/editar$/);
    fireEvent.click(within(bloqueio).getByRole('button', { name: 'Entendi' }));
    expect(nomesNaTabela()).toContain('Ana Beatriz Carvalho');
  });
});
