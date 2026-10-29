// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PERFIS } from '../constants/perfis';
import { abrirAppComServidor } from '../test-utils/app';

const DIZIMOS = '3a9d2b1c-6e4f-4a8b-9c2d-000000000001';
const PRIMEIRA_DO_MES = '9b4c7d2e-1f3a-4e6b-8d5c-000000000012'; // Dízimo de 450,00 da Ana, mês atual

let transporte;

afterEach(() => {
  transporte?.restaurar();
  transporte = null;
  window.sessionStorage.clear();
});

function abrir(caminho, perfil = PERFIS.TESOUREIRO) {
  const aberto = abrirAppComServidor(caminho, perfil);
  transporte = aberto.transporte;
  return aberto;
}

const campo = (rotulo) => screen.getByLabelText(new RegExp(`^${rotulo}`));
const digitar = (rotulo, valor) => fireEvent.change(campo(rotulo), { target: { value: valor } });
const chamadas = (metodo) => transporte.adapter.mock.calls.map(([config]) => config).filter((c) => c.method === metodo);
const erroDe = (elemento) => {
  const ids = (elemento.getAttribute('aria-describedby') ?? '').split(' ').filter((id) => id.endsWith('-erro'));
  return ids.length ? document.getElementById(ids[0])?.textContent ?? null : null;
};
const opcoesDaCategoria = () => within(campo('Categoria')).getAllByRole('option').map((o) => o.textContent);

async function abrirCadastro(perfil) {
  const aberto = abrir('/financeiro/novo', perfil);
  await screen.findByRole('heading', { name: 'Nova movimentação' }, { timeout: 5000 });
  // As categorias carregaram quando o seletor deixa de estar desabilitado (após escolher o tipo).
  return aberto;
}

async function escolherTipo(rotulo) {
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(rotulo) }));
  await waitFor(() => expect(campo('Categoria').disabled).toBe(false));
}

describe('cadastro de movimentação', () => {
  it('máscara de moeda pt-BR: sem sinal, vírgula decimal, 2 casas; formata ao sair do campo', async () => {
    await abrirCadastro();
    digitar('Valor', '-1234,567');
    expect(campo('Valor').value).toBe('1234,56');
    fireEvent.blur(campo('Valor'));
    expect(campo('Valor').value).toBe('1.234,56');
    digitar('Valor', '10.5');
    expect(campo('Valor').value).toBe('10,5');
  });

  it('valida tipo, valor positivo, categoria (RN10) e descrição sem chamar a API', async () => {
    await abrirCadastro();
    digitar('Valor', '0,00');
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar movimentação' }));

    const tipo = screen.getByRole('group', { name: /Tipo/ });
    expect(erroDe(tipo)).toBe('Escolha se é uma receita ou uma despesa.');
    expect(erroDe(campo('Valor'))).toBe('O valor deve ser maior que zero.');
    expect(erroDe(campo('Categoria'))).toBe('Escolha a categoria.');
    expect(erroDe(campo('Descrição'))).toBe('Informe a descrição.');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: /Receita/ }));
    expect(chamadas('post')).toHaveLength(0);
  });

  it('categoria só lista as do tipo; trocar o tipo limpa a categoria que não serve', async () => {
    await abrirCadastro();
    expect(campo('Categoria').disabled).toBe(true);
    await escolherTipo('Receita');
    expect(opcoesDaCategoria()).toEqual(['Escolha…', 'Dízimos', 'Eventos', 'Ofertas']);
    fireEvent.change(campo('Categoria'), { target: { value: DIZIMOS } });

    await escolherTipo('Despesa');
    expect(campo('Categoria').value).toBe('');
    expect(opcoesDaCategoria()).toEqual(['Escolha…', 'Ação social', 'Água e energia', 'Manutenção']);
  });

  it('envia valor numérico positivo com 2 casas e o membro buscado pelo /members/lookup', async () => {
    const { localizacao } = await abrirCadastro();
    await escolherTipo('Receita');
    digitar('Valor', '1.234,56');
    digitar('Data', '05102026');
    fireEvent.change(campo('Categoria'), { target: { value: DIZIMOS } });
    digitar('Descrição', '  Dízimo   de outubro ');

    fireEvent.change(campo('Membro vinculado'), { target: { value: 'ana' } });
    const opcao = await screen.findByRole('option', { name: /Ana Beatriz Carvalho/ }, { timeout: 2000 });
    expect(within(opcao).getByText('Ativo')).toBeTruthy();
    fireEvent.mouseDown(opcao);
    expect(screen.getByRole('group', { name: 'Membro vinculado: Ana Beatriz Carvalho' })).toBeTruthy();

    const buscas = chamadas('get').filter((c) => c.url.startsWith('/members'));
    expect(buscas.every((c) => c.url === '/members/lookup')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar movimentação' }));
    await waitFor(() => expect(localizacao.atual.pathname).toBe('/financeiro'));
    expect(JSON.parse(chamadas('post')[0].data)).toEqual({
      descricao: 'Dízimo de outubro',
      valor: 1234.56,
      data: '2026-10-05',
      tipo: 'RECEITA',
      categoriaId: DIZIMOS,
      membroId: '7c0e6a1e-5b2f-4d6a-9f3e-000000000001',
    });
    expect(chamadas('post')[0].data).toContain('"valor":1234.56');
    expect(await screen.findByText('Movimentação cadastrada.')).toBeTruthy();
  });

  it('nova categoria pela modal (A/T): avisa nome repetido e, criada, fica escolhida', async () => {
    await abrirCadastro(PERFIS.ADMINISTRADOR);
    await escolherTipo('Despesa');
    fireEvent.click(screen.getByRole('button', { name: 'Nova categoria' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nova categoria' });
    expect(within(dialogo).getByLabelText(/^Tipo/).value).toBe('DESPESA');

    fireEvent.change(within(dialogo).getByLabelText(/^Nome/), { target: { value: 'manutenção' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Criar categoria' }));
    expect(within(dialogo).getByText('Já existe a categoria "Manutenção" para despesas.')).toBeTruthy();
    expect(chamadas('post')).toHaveLength(0);

    fireEvent.change(within(dialogo).getByLabelText(/^Nome/), { target: { value: '  Material de limpeza ' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Criar categoria' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(JSON.parse(chamadas('post')[0].data)).toEqual({ nome: 'Material de limpeza', tipo: 'DESPESA' });
    const escolhida = campo('Categoria');
    expect(escolhida.options[escolhida.selectedIndex].textContent).toBe('Material de limpeza');
  });
});

describe('edição de movimentação', () => {
  it('carrega do servidor (valor "450,00" como na máscara, não "450"; membro) e salva com PUT', async () => {
    const { localizacao } = abrir(`/financeiro/${PRIMEIRA_DO_MES}/editar`);
    await screen.findByRole('heading', { name: 'Editar movimentação' }, { timeout: 5000 });
    await waitFor(() => expect(campo('Valor').value).toBe('450,00'));
    expect(screen.getByRole('radio', { name: /Receita/ }).checked).toBe(true);
    expect(screen.getByRole('group', { name: 'Membro vinculado: Ana Beatriz Carvalho' })).toBeTruthy();
    await waitFor(() => expect(campo('Categoria').value).toBe(DIZIMOS));

    fireEvent.click(screen.getByRole('button', { name: 'Remover Ana Beatriz Carvalho' }));
    digitar('Valor', '500');
    fireEvent.blur(campo('Valor'));
    expect(campo('Valor').value).toBe('500,00');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(localizacao.atual.pathname).toBe('/financeiro'));
    const [put] = chamadas('put');
    expect(put.url).toBe(`/financial/${PRIMEIRA_DO_MES}`);
    expect(JSON.parse(put.data)).toMatchObject({ valor: 500, membroId: null, categoriaId: DIZIMOS });
  });

  it('movimentação inexistente mostra "não encontrada"', async () => {
    abrir('/financeiro/00000000-0000-4000-8000-999999999999/editar');
    expect(await screen.findByRole('heading', { name: 'Movimentação não encontrada' }, { timeout: 5000 })).toBeTruthy();
  });
});
