// @vitest-environment jsdom
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PERFIS } from '../constants/perfis';
import { criarMembrosIniciais } from '../services/mock/dadosIniciais';
import { abrirAppComServidor } from '../test-utils/app';

const [ANA, , BRUNA] = criarMembrosIniciais();
let transporte;

afterEach(() => {
  transporte?.restaurar();
  transporte = null;
  window.sessionStorage.clear();
});

async function abrir(membro, perfil, caminho = `/membros/${membro.id}`) {
  const aberto = abrirAppComServidor(caminho, perfil);
  transporte = aberto.transporte;
  await screen.findByRole('heading', { name: membro.nome });
  return aberto;
}

const dado = (rotulo) => screen.getByText(rotulo, { selector: 'dt' }).nextElementSibling.textContent;

describe('detalhes do membro', () => {
  it('mostra todos os dados, formatados, e "Não informado" no que falta', async () => {
    await abrir(BRUNA, PERFIS.PASTOR);
    expect(dado('CPF')).toBe('248.438.073-97');
    expect(dado('Status')).toBe('Visitante');
    expect(dado('E-mail')).toBe('bruna.kessler@email.com');
    expect(dado('Telefone')).toBe('(45) 3224-1876');
    expect(dado('Endereço')).toBe('Rua Souza Naves, 88 - Country, Cascavel/PR');
    expect(dado('Nascimento')).toBe('23/07/1995');
    expect(dado('Conversão')).toBe('Não informado');
    expect(dado('Batismo')).toBe('Não informado');
  });

  it('ADMINISTRADOR vê Editar e Excluir', async () => {
    await abrir(ANA, PERFIS.ADMINISTRADOR);
    expect(screen.getByRole('link', { name: `Editar ${ANA.nome}` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `Excluir ${ANA.nome}` })).toBeTruthy();
  });

  it('SECRETARIO vê Editar, mas não Excluir', async () => {
    await abrir(ANA, PERFIS.SECRETARIO);
    expect(screen.getByRole('link', { name: `Editar ${ANA.nome}` })).toBeTruthy();
    expect(screen.queryByRole('button', { name: `Excluir ${ANA.nome}` })).toBeNull();
  });

  it('PASTOR só consulta', async () => {
    await abrir(ANA, PERFIS.PASTOR);
    expect(screen.queryByRole('link', { name: `Editar ${ANA.nome}` })).toBeNull();
    expect(screen.queryByRole('button', { name: `Excluir ${ANA.nome}` })).toBeNull();
  });

  it('excluir pelos detalhes volta para a lista de onde a pessoa veio', async () => {
    const aberto = abrirAppComServidor('/membros?busca=bru', PERFIS.ADMINISTRADOR);
    transporte = aberto.transporte;
    const { localizacao } = aberto;
    fireEvent.click((await screen.findAllByRole('link', { name: BRUNA.nome }))[0]);
    await screen.findByRole('heading', { name: BRUNA.nome });

    fireEvent.click(screen.getByRole('button', { name: `Excluir ${BRUNA.nome}` }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir membro' }));

    expect(await screen.findByText('Membro excluído.')).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Nenhum membro encontrado' })).toBeTruthy();
    expect(`${localizacao.atual.pathname}${localizacao.atual.search}`).toBe('/membros?busca=bru');
  });
});
