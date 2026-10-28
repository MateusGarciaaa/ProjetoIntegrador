// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PERFIS } from '../constants/perfis';
import { agoraDoServidor, MENSAGEM_RN09_BACKEND, MOTIVO_EVENTO_ENCERRADO } from '../schemas/regrasEvento';
import { criarEventosIniciais } from '../services/mock/dadosIniciais';
import { abrirApp, abrirAppComServidor } from '../test-utils/app';
import { corpoApi, instalarTransporte, resposta } from '../test-utils/transporte';

const EVENTOS = criarEventosIniciais(agoraDoServidor().data);
const ENCERRADO = EVENTOS.find((e) => e.titulo === 'Culto de ação de graças');
const FUTURO = EVENTOS.find((e) => e.titulo === 'Conferência de famílias');

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
const enviar = (nome = 'Cadastrar evento') => fireEvent.click(screen.getByRole('button', { name: nome }));
const chamadas = (metodo) => transporte.adapter.mock.calls.map(([config]) => config).filter((c) => c.method === metodo);
const erroDoCampo = (rotulo) => {
  const entrada = campo(rotulo);
  const ids = (entrada.getAttribute('aria-describedby') ?? '').split(' ').filter((id) => id.endsWith('-erro'));
  return entrada.getAttribute('aria-invalid') === 'true' && ids.length ? document.getElementById(ids[0]).textContent : null;
};

describe('cadastro de evento', () => {
  it('RN08: sem data, mostra o erro no campo, foca nele e não chama a API', async () => {
    abrir('/eventos/novo');
    await screen.findByRole('heading', { name: 'Novo evento' });
    digitar('Título', 'Vigília de oração');
    digitar('Horário', '2200');

    enviar();

    expect(erroDoCampo('Data')).toBe('Informe a data do evento.');
    expect(document.activeElement).toBe(campo('Data'));
    expect(chamadas('post')).toHaveLength(0);
  });

  it('valida todos os obrigatórios de uma vez, na ordem da tela', async () => {
    abrir('/eventos/novo');
    await screen.findByRole('heading', { name: 'Novo evento' });
    digitar('Data', '31022026');

    enviar();

    expect(erroDoCampo('Título')).toBe('Informe o título.');
    expect(erroDoCampo('Data')).toBe('Informe uma data válida, no formato DD/MM/AAAA.');
    expect(erroDoCampo('Horário')).toBe('Informe o horário.');
    expect(document.activeElement).toBe(campo('Título'));
    expect(chamadas('post')).toHaveLength(0);
  });

  it('o que foi digitado é exatamente o que vai ao backend e o que aparece nos detalhes', async () => {
    const { localizacao } = abrir('/eventos/novo');
    await screen.findByRole('heading', { name: 'Novo evento' });
    digitar('Título', '  Vigília   de oração ');
    digitar('Data', '05112026');
    digitar('Horário', '1930');
    expect(campo('Data').value).toBe('05/11/2026');
    expect(campo('Horário').value).toBe('19:30');

    enviar();

    await screen.findByRole('heading', { name: 'Vigília de oração', level: 1 });
    expect(JSON.parse(chamadas('post')[0].data)).toEqual({
      titulo: 'Vigília de oração',
      descricao: null,
      data: '2026-11-05',
      horario: '19:30',
      local: null,
    });
    expect(screen.getByText('quinta-feira, 05/11/2026')).toBeTruthy();
    expect(screen.getByText('19:30')).toBeTruthy();
    expect(localizacao.atual.pathname).toMatch(/^\/eventos\/[0-9a-f-]{36}$/);
    expect(screen.getByText('Evento cadastrado.')).toBeTruthy();
  });

  it('aberto pelo "+" do calendário, já vem com a data do dia', async () => {
    abrir('/eventos/novo?data=2026-12-24');
    await screen.findByRole('heading', { name: 'Novo evento' });
    expect(campo('Data').value).toBe('24/12/2026');
  });

  it('400 do @Valid vai para o campo correspondente', async () => {
    transporte = instalarTransporte((config) =>
      resposta(400, corpoApi(400, 'O título deve ter no máximo 150 caracteres', '/api/v1/events'))(config),
    );
    abrirApp('/eventos/novo', PERFIS.SECRETARIO);
    await screen.findByRole('heading', { name: 'Novo evento' });
    digitar('Título', 'Culto');
    digitar('Data', '05112026');
    digitar('Horário', '1930');

    enviar();

    await waitFor(() => expect(erroDoCampo('Título')).toBe('O título deve ter no máximo 150 caracteres'));
  });
});

describe('edição de evento', () => {
  it('carrega o evento do servidor (horário sem segundos) e salva', async () => {
    abrir(`/eventos/${FUTURO.id}/editar`);
    await waitFor(() => expect(campo('Título').value).toBe('Conferência de famílias'));
    expect(campo('Horário').value).toBe('19:00');

    digitar('Local', 'Ginásio municipal');
    enviar('Salvar alterações');

    await screen.findByRole('heading', { name: 'Conferência de famílias', level: 1 });
    expect(JSON.parse(chamadas('put')[0].data)).toMatchObject({ local: 'Ginásio municipal', horario: '19:00', data: FUTURO.data });
    expect(screen.getByText('Ginásio municipal')).toBeTruthy();
  });

  it('RN09: SECRETARIO abrindo a edição de um evento encerrado vê o motivo, não o formulário', async () => {
    abrir(`/eventos/${ENCERRADO.id}/editar`, PERFIS.SECRETARIO);
    expect(await screen.findByText(MOTIVO_EVENTO_ENCERRADO)).toBeTruthy();
    expect(screen.queryByLabelText(/^Título/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Ver detalhes' }).getAttribute('href')).toBe(`/eventos/${ENCERRADO.id}`);
  });

  it('RN09: ADMINISTRADOR edita o evento encerrado', async () => {
    abrir(`/eventos/${ENCERRADO.id}/editar`, PERFIS.ADMINISTRADOR);
    await waitFor(() => expect(campo('Título').value).toBe('Culto de ação de graças'));
    digitar('Descrição', 'Culto realizado com a presença de 120 pessoas.');

    enviar('Salvar alterações');

    expect(await screen.findByText('Culto realizado com a presença de 120 pessoas.')).toBeTruthy();
  });

  it('RN09: se o evento encerrar com o formulário aberto, o 409 do servidor aparece no topo', async () => {
    transporte = instalarTransporte((config) => {
      if (config.method === 'get') return resposta(200, FUTURO)(config);
      return resposta(409, corpoApi(409, MENSAGEM_RN09_BACKEND, `/api/v1/events/${FUTURO.id}`))(config);
    });
    abrirApp(`/eventos/${FUTURO.id}/editar`, PERFIS.SECRETARIO);
    await waitFor(() => expect(campo('Título').value).toBe('Conferência de famílias'));

    enviar('Salvar alterações');

    expect((await screen.findByRole('alert')).textContent).toBe(MENSAGEM_RN09_BACKEND);
    expect(campo('Título').value).toBe('Conferência de famílias');
  });

  it('evento inexistente: "Evento não encontrado"', async () => {
    abrir('/eventos/00000000-0000-4000-8000-000000000999/editar');
    expect(await screen.findByRole('heading', { name: 'Evento não encontrado' })).toBeTruthy();
  });
});
