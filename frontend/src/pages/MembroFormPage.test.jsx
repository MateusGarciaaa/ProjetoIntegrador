// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PERFIS } from '../constants/perfis';
import { criarMembrosIniciais } from '../services/mock/dadosIniciais';
import { abrirApp, abrirAppComServidor } from '../test-utils/app';
import { corpoApi, instalarTransporte, resposta } from '../test-utils/transporte';

const ANA = criarMembrosIniciais()[0];
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

const campo = (rotulo) => screen.getByLabelText(new RegExp(`^${rotulo}`));
const digitar = (rotulo, valor) => fireEvent.change(campo(rotulo), { target: { value: valor } });
const enviar = (nome = 'Cadastrar membro') => fireEvent.click(screen.getByRole('button', { name: nome }));
const chamadas = (metodo) => transporte.adapter.mock.calls.map(([config]) => config).filter((c) => c.method === metodo);
const erroDoCampo = (rotulo) => {
  const entrada = campo(rotulo);
  const idErro = entrada.getAttribute('aria-describedby');
  return entrada.getAttribute('aria-invalid') === 'true' && idErro ? document.getElementById(idErro).textContent : null;
};

async function preencherNovo({ nome = 'Paulo Henrique', cpf = '12345678909', email = 'paulo@igreja.org' } = {}) {
  await screen.findByRole('heading', { name: 'Novo membro' });
  digitar('Nome completo', nome);
  digitar('CPF', cpf);
  digitar('E-mail', email);
}

describe('cadastro de membro', () => {
  it('valida no cliente e não envia nada enquanto houver erro', async () => {
    abrir('/membros/novo');
    await screen.findByRole('heading', { name: 'Novo membro' });
    digitar('E-mail', 'paulo@igreja');
    digitar('Nascimento', '31022000');

    enviar();

    expect(erroDoCampo('Nome completo')).toBe('Informe o nome.');
    expect(erroDoCampo('CPF')).toBe('Informe o CPF.');
    expect(erroDoCampo('E-mail')).toMatch(/e-mail válido/);
    expect(erroDoCampo('Nascimento')).toMatch('DD/MM/AAAA');
    expect(document.activeElement).toBe(campo('Nome completo'));
    expect(chamadas('post')).toHaveLength(0);
  });

  it('aplica as máscaras de CPF, telefone e data', async () => {
    abrir('/membros/novo');
    await screen.findByRole('heading', { name: 'Novo membro' });
    digitar('CPF', '12345678909');
    digitar('Telefone', '45999120341');
    digitar('Batismo', '05032020');
    expect(campo('CPF').value).toBe('123.456.789-09');
    expect(campo('Telefone').value).toBe('(45) 99912-0341');
    expect(campo('Batismo').value).toBe('05/03/2020');
  });

  it('RN03: e-mail já cadastrado (409) aparece no campo e-mail', async () => {
    abrir('/membros/novo');
    await preencherNovo({ email: ANA.email });

    enviar();

    await waitFor(() => expect(erroDoCampo('E-mail')).toBe('Já existe um membro com este e-mail'));
    expect(erroDoCampo('CPF')).toBeNull();
    expect(document.activeElement).toBe(campo('E-mail'));
  });

  it('RN04: CPF já cadastrado (409) aparece no campo CPF', async () => {
    abrir('/membros/novo');
    await preencherNovo({ cpf: ANA.cpf });

    enviar();

    await waitFor(() => expect(erroDoCampo('CPF')).toBe('Já existe um membro com este CPF'));
    expect(erroDoCampo('E-mail')).toBeNull();
  });

  it('400 do @Valid vai para o campo pela mensagem do DTO; o resto, para o topo', async () => {
    transporte = instalarTransporte(
      resposta(400, corpoApi(400, 'O telefone deve ter no máximo 20 caracteres, Regra nova do servidor', '/api/v1/members')),
    );
    abrirApp('/membros/novo', PERFIS.ADMINISTRADOR);
    await preencherNovo();

    enviar();

    await waitFor(() => expect(erroDoCampo('Telefone')).toBe('O telefone deve ter no máximo 20 caracteres'));
    expect(screen.getByRole('alert').textContent).toContain('Regra nova do servidor');
  });

  it('várias mensagens do servidor para o mesmo campo: o campo mostra só a primeira', async () => {
    const mensagem = 'O CPF é obrigatório, O CPF deve conter 11 dígitos numéricos, E-mail inválido';
    transporte = instalarTransporte(resposta(400, corpoApi(400, mensagem, '/api/v1/members')));
    abrirApp('/membros/novo', PERFIS.SECRETARIO);
    await preencherNovo();

    enviar();

    await waitFor(() => expect(erroDoCampo('CPF')).toBe('O CPF é obrigatório'));
    expect(erroDoCampo('E-mail')).toBe('E-mail inválido');
    expect(screen.queryByText('O CPF deve conter 11 dígitos numéricos')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('envia o MembroRequest normalizado e abre os detalhes do novo membro', async () => {
    const { localizacao } = abrir('/membros/novo');
    await preencherNovo({ email: ' Paulo@Igreja.ORG ' });
    digitar('Telefone', '4532241876');
    digitar('Nascimento', '14031988');
    fireEvent.change(campo('Status'), { target: { value: 'VISITANTE' } });

    enviar();

    expect(await screen.findByText('Membro cadastrado.')).toBeTruthy();
    expect(JSON.parse(chamadas('post')[0].data)).toEqual({
      nome: 'Paulo Henrique',
      cpf: '12345678909',
      email: 'paulo@igreja.org',
      telefone: '4532241876',
      endereco: null,
      dataNascimento: '1988-03-14',
      dataBatismo: null,
      dataConversao: null,
      status: 'VISITANTE',
    });
    expect(await screen.findByRole('heading', { name: 'Paulo Henrique' })).toBeTruthy();
    expect(localizacao.atual.pathname).toMatch(/^\/membros\/[0-9a-f-]+$/);
  });
});

describe('edição de membro', () => {
  it('carrega pelo GET /members/{id}, com datas em DD/MM/AAAA, e salva com PUT', async () => {
    abrir(`/membros/${ANA.id}/editar`);
    await screen.findByRole('heading', { name: 'Editar membro' });
    await waitFor(() => expect(campo('Nome completo').value).toBe('Ana Beatriz Carvalho'));
    expect(campo('CPF').value).toBe('529.982.247-25');
    expect(campo('Nascimento').value).toBe('14/03/1988');

    fireEvent.change(campo('Status'), { target: { value: 'AFASTADO' } });
    enviar('Salvar alterações');

    expect(await screen.findByText('Alterações salvas.')).toBeTruthy();
    const put = chamadas('put')[0];
    expect(put.url).toBe(`/members/${ANA.id}`);
    expect(JSON.parse(put.data)).toMatchObject({ status: 'AFASTADO', dataNascimento: '1988-03-14', cpf: ANA.cpf });
  });

  it('membro inexistente mostra "Membro não encontrado"', async () => {
    abrir('/membros/00000000-0000-4000-8000-999999999999/editar');
    expect(await screen.findByRole('heading', { name: 'Membro não encontrado' })).toBeTruthy();
  });
});
