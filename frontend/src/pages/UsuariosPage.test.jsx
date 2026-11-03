// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PERFIS } from '../constants/perfis';
import { abrirAppComServidor } from '../test-utils/app';

let transporte;

afterEach(() => {
  transporte?.restaurar();
  transporte = null;
  window.sessionStorage.clear();
});

function abrir(caminho, perfil = PERFIS.ADMINISTRADOR) {
  const aberto = abrirAppComServidor(caminho, perfil);
  transporte = aberto.transporte;
  return aberto;
}

const tabela = () => screen.getByRole('table', { name: 'Usuários do sistema' });
const naTabela = () => within(tabela());
const esperarLista = () => screen.findByRole('table', { name: 'Usuários do sistema' });
const nomesNaTabela = () =>
  naTabela()
    .getAllByRole('rowheader')
    .map((celula) => celula.textContent);
const linhaDe = (nome) =>
  naTabela()
    .getAllByRole('row')
    .find((linha) => linha.textContent.includes(nome));

describe('Usuários: acesso', () => {
  it.each([PERFIS.PASTOR, PERFIS.SECRETARIO, PERFIS.TESOUREIRO, PERFIS.MEMBRO])('%s não acessa a gestão de usuários', async (perfil) => {
    abrir('/usuarios', perfil);
    expect(await screen.findByRole('heading', { name: 'Sem acesso à área Usuários' })).toBeTruthy();
  });
});

describe('Usuários: lista', () => {
  it('lista os usuários por nome e marca a própria conta, sem "Desativar" para ela', async () => {
    abrir('/usuarios');
    await esperarLista();
    expect(nomesNaTabela()).toEqual([
      'Débora Lins',
      'Helena Duarte(você)',
      'Marcos Tavares',
      'Samuel Ribeiro',
      'Tiago Moreira',
    ]);
    expect(naTabela().queryByRole('button', { name: 'Desativar Helena Duarte' })).toBeNull();
    expect(naTabela().getByRole('button', { name: 'Desativar Marcos Tavares' })).toBeTruthy();
  });

  it('filtra por perfil e situação pela URL', async () => {
    const { localizacao } = abrir('/usuarios');
    await esperarLista();
    fireEvent.change(screen.getByLabelText('Perfil'), { target: { value: 'TESOUREIRO' } });

    await waitFor(() => expect(nomesNaTabela()).toEqual(['Débora Lins']));
    expect(localizacao.atual.search).toBe('?perfil=TESOUREIRO');

    fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'inativos' } });
    expect(await screen.findByText('Nenhum usuário encontrado')).toBeTruthy();
    const ultima = transporte.adapter.mock.calls.map(([config]) => config).filter((c) => c.url === '/users').at(-1);
    expect(ultima.params).toMatchObject({ perfil: 'TESOUREIRO', ativo: false });
  });
});

describe('Usuários: cadastro e convite', () => {
  it('valida no cliente, cadastra sem senha e mostra o convite pendente, que pode ser reenviado', async () => {
    abrir('/usuarios/novo');
    fireEvent.click(await screen.findByRole('button', { name: 'Cadastrar e enviar convite' }));
    expect(await screen.findByText('Informe o nome.')).toBeTruthy();
    expect(screen.getByText('Escolha um perfil.')).toBeTruthy();
    expect(screen.queryByLabelText(/senha/i)).toBeNull();

    fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: 'Paula Lima' } });
    fireEvent.change(screen.getByLabelText(/^E-mail/), { target: { value: ' Paula@Igreja.ORG ' } });
    fireEvent.change(screen.getByLabelText(/^Perfil/), { target: { value: 'PASTOR' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar e enviar convite' }));

    expect(await screen.findByText('Usuário cadastrado. O convite foi enviado para paula@igreja.org.')).toBeTruthy();
    await esperarLista();
    expect(within(linhaDe('Paula Lima')).getByText('Convite pendente')).toBeTruthy();

    fireEvent.click(naTabela().getByRole('button', { name: 'Reenviar convite para Paula Lima' }));
    expect(await screen.findByText('Convite reenviado para paula@igreja.org. O link anterior deixou de valer.')).toBeTruthy();
  });

  it('e-mail já cadastrado (409) aparece no campo', async () => {
    abrir('/usuarios/novo');
    fireEvent.change(await screen.findByLabelText(/^Nome/), { target: { value: 'Outra Pessoa' } });
    fireEvent.change(screen.getByLabelText(/^E-mail/), { target: { value: 'PASTOR@churchhub.local' } });
    fireEvent.change(screen.getByLabelText(/^Perfil/), { target: { value: 'MEMBRO' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar e enviar convite' }));

    expect(await screen.findByText('Já existe um usuário com este e-mail')).toBeTruthy();
    expect(screen.getByLabelText(/^E-mail/).getAttribute('aria-invalid')).toBe('true');
  });
});

describe('Usuários: edição e situação', () => {
  it('edita nome e perfil; o e-mail não muda', async () => {
    abrir('/usuarios');
    await esperarLista();
    fireEvent.click(naTabela().getByRole('link', { name: 'Editar Marcos Tavares' }));

    const nome = await screen.findByLabelText(/^Nome/);
    expect(screen.getByLabelText(/^E-mail/).disabled).toBe(true);
    fireEvent.change(nome, { target: { value: 'Marcos T. Tavares' } });
    fireEvent.change(screen.getByLabelText(/^Perfil/), { target: { value: 'TESOUREIRO' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Alterações salvas.')).toBeTruthy();
    await esperarLista();
    expect(within(linhaDe('Marcos T. Tavares')).getByText('Tesoureiro')).toBeTruthy();
  });

  it('na própria conta o perfil não pode ser trocado', async () => {
    abrir('/usuarios');
    await esperarLista();
    fireEvent.click(naTabela().getByRole('link', { name: 'Editar Helena Duarte' }));
    expect((await screen.findByLabelText(/^Perfil/)).disabled).toBe(true);
  });

  it('desativa com confirmação e reativa', async () => {
    abrir('/usuarios');
    await esperarLista();
    fireEvent.click(naTabela().getByRole('button', { name: 'Desativar Marcos Tavares' }));

    const dialogo = await screen.findByRole('dialog', { name: 'Desativar usuário' });
    expect(within(dialogo).getByText(/perde o acesso na hora/)).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Desativar' }));

    expect(await screen.findByText('Marcos Tavares foi desativado.')).toBeTruthy();
    await waitFor(() => expect(within(linhaDe('Marcos Tavares')).getByText('Inativo')).toBeTruthy());

    fireEvent.click(naTabela().getByRole('button', { name: 'Ativar Marcos Tavares' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Ativar usuário' })).getByRole('button', { name: 'Ativar' }));
    expect(await screen.findByText('Marcos Tavares foi ativado.')).toBeTruthy();
  });
});
