// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PERFIS } from '../constants/perfis';
import { agoraDoServidor, MOTIVO_EVENTO_ENCERRADO } from '../schemas/regrasEvento';
import { criarEventosIniciais } from '../services/mock/dadosIniciais';
import { abrirAppComServidor } from '../test-utils/app';
import { formatarDataPorExtenso } from '../utils/datas';

const EVENTOS = criarEventosIniciais(agoraDoServidor().data);
const ENCERRADO = EVENTOS.find((e) => e.titulo === 'Culto de ação de graças');
const ORACAO = EVENTOS.find((e) => e.titulo === 'Reunião de oração');

let transporte;

afterEach(() => {
  transporte?.restaurar();
  transporte = null;
  window.sessionStorage.clear();
});

function abrir(caminho, perfil) {
  const aberto = abrirAppComServidor(caminho, perfil);
  transporte = aberto.transporte;
  return aberto;
}

describe('detalhes do evento', () => {
  it('mostra data por extenso, horário, local, situação e "Sem descrição." quando falta', async () => {
    abrir(`/eventos/${ORACAO.id}`, PERFIS.MEMBRO);
    expect(await screen.findByRole('heading', { name: 'Reunião de oração', level: 1 })).toBeTruthy();
    expect(screen.getByText(formatarDataPorExtenso(ORACAO.data))).toBeTruthy();
    expect(screen.getByText('20:00')).toBeTruthy();
    expect(screen.getByText('Templo principal')).toBeTruthy();
    expect(screen.getByText('Agendado')).toBeTruthy();
    expect(screen.getByText('Sem descrição.')).toBeTruthy();
    // MEMBRO só consulta.
    expect(screen.queryByRole('link', { name: /^Editar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Editar|^Excluir/ })).toBeNull();
  });

  it('RN09: SECRETARIO vê o aviso e o "Editar" desabilitado no evento encerrado', async () => {
    abrir(`/eventos/${ENCERRADO.id}`, PERFIS.SECRETARIO);
    await screen.findByRole('heading', { name: 'Culto de ação de graças', level: 1 });
    expect(screen.getByText('Encerrado')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe(MOTIVO_EVENTO_ENCERRADO);
    const editar = screen.getByRole('button', { name: 'Editar Culto de ação de graças' });
    expect(editar.getAttribute('aria-disabled')).toBe('true');
    expect(screen.queryByRole('button', { name: /^Excluir/ })).toBeNull();
  });

  it('SECRETARIO edita evento que ainda não aconteceu', async () => {
    abrir(`/eventos/${ORACAO.id}`, PERFIS.SECRETARIO);
    await screen.findByRole('heading', { name: 'Reunião de oração', level: 1 });
    expect(screen.getByRole('link', { name: 'Editar Reunião de oração' }).getAttribute('href')).toBe(`/eventos/${ORACAO.id}/editar`);
    expect(screen.queryByText(MOTIVO_EVENTO_ENCERRADO)).toBeNull();
  });

  it('ADMINISTRADOR: sem aviso no encerrado, e exclui com confirmação voltando para a agenda', async () => {
    const { localizacao } = abrir(`/eventos/${ENCERRADO.id}`, PERFIS.ADMINISTRADOR);
    await screen.findByRole('heading', { name: 'Culto de ação de graças', level: 1 });
    expect(screen.queryByText(MOTIVO_EVENTO_ENCERRADO)).toBeNull();
    expect(screen.getByRole('link', { name: 'Editar Culto de ação de graças' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Culto de ação de graças' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Excluir evento' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir evento' }));

    await screen.findByRole('heading', { name: 'Eventos', level: 1 });
    expect(localizacao.atual.pathname).toBe('/eventos');
    expect(screen.getByText('Evento excluído.')).toBeTruthy();
  });

  it('id que não é UUID é tratado como "não encontrado"', async () => {
    abrir('/eventos/abc', PERFIS.PASTOR);
    expect(await screen.findByRole('heading', { name: 'Evento não encontrado' })).toBeTruthy();
  });
});
