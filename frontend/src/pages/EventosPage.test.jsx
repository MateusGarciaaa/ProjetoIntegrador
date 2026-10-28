// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MEDIA_CALENDARIO_GRADE } from '../constants/eventos';
import { PERFIS } from '../constants/perfis';
import { agoraDoServidor, MOTIVO_EVENTO_ENCERRADO } from '../schemas/regrasEvento';
import { CONTAS_DEMO, SENHA_DEMO } from '../services/mock/contasDemo';
import { criarEventosIniciais } from '../services/mock/dadosIniciais';
import { abrirAppComServidor } from '../test-utils/app';
import { intervaloDaGrade, mesDaData, somarMeses } from '../utils/calendario';
import { formatarData, formatarDataPorExtenso, formatarMesAno } from '../utils/datas';

// Os eventos de demonstração ficam em volta de hoje (no fuso do servidor), como no backend.
const HOJE = agoraDoServidor().data;
const EVENTOS = criarEventosIniciais(HOJE);
const ENCERRADO = EVENTOS.find((e) => e.titulo === 'Culto de ação de graças');
const CELEBRACAO = EVENTOS.find((e) => e.titulo === 'Culto de celebração');

let transporte;
let matchMediaOriginal = null;

afterEach(() => {
  transporte?.restaurar();
  transporte = null;
  window.sessionStorage.clear();
  if (matchMediaOriginal) window.matchMedia = matchMediaOriginal;
  matchMediaOriginal = null;
});

function abrir(caminho, perfil = PERFIS.SECRETARIO) {
  const aberto = abrirAppComServidor(caminho, perfil);
  transporte = aberto.transporte;
  return aberto;
}

/** O jsdom simula celular (matchMedia sempre false); aqui a tela é larga o bastante para a grade. */
function telaLarga() {
  matchMediaOriginal = window.matchMedia;
  window.matchMedia = (consulta) => ({
    matches: consulta === MEDIA_CALENDARIO_GRADE,
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}

/** Cadastra eventos direto no servidor simulado (como outra pessoa faria). */
function cadastrarNoServidor(atender, quantidade, { data = '2030-01-15' } = {}) {
  const conta = CONTAS_DEMO.find((c) => c.perfil === PERFIS.ADMINISTRADOR);
  const login = atender({ metodo: 'post', url: '/auth/login', corpo: { email: conta.email, password: SENHA_DEMO } });
  for (let i = 0; i < quantidade; i += 1) {
    atender({
      metodo: 'post',
      url: '/events',
      authorization: `Bearer ${login.data.token}`,
      corpo: { titulo: `Ensaio do coral ${String(i + 1).padStart(2, '0')}`, data, horario: `${String(8 + i).padStart(2, '0')}:00`, descricao: null, local: null },
    });
  }
}

function consultasDeEventos() {
  return transporte.adapter.mock.calls.map(([config]) => config).filter((c) => c.url === '/events').map((c) => c.params);
}

const tabela = () => screen.getByRole('table', { name: 'Eventos' });
const esperarLista = () => screen.findByRole('table', { name: 'Eventos' });
const titulosNaTabela = () => within(tabela()).getAllByRole('rowheader').map((celula) => celula.textContent);
const linhaDo = (titulo) => within(tabela()).getByRole('rowheader', { name: titulo }).closest('tr');

describe('lista de eventos: renderização', () => {
  it('mostra título, data, horário, local e situação de cada evento, em ordem de data e horário', async () => {
    abrir('/eventos?visao=lista', PERFIS.PASTOR);
    await esperarLista();

    expect(titulosNaTabela()).toEqual([...EVENTOS].sort((a, b) => `${a.data}${a.horario}`.localeCompare(`${b.data}${b.horario}`)).map((e) => e.titulo));
    const celulas = within(linhaDo('Culto de ação de graças'))
      .getAllByRole('cell')
      .map((celula) => celula.textContent);
    expect(celulas).toEqual([formatarData(ENCERRADO.data), '19:00', 'Templo principal', 'Encerrado']);
    expect(within(linhaDo('Culto de celebração')).getByText('Agendado')).toBeTruthy();
    expect(consultasDeEventos()[0]).toEqual({ page: 0, size: 10, sort: ['data,asc', 'horario,asc', 'id,asc'] });
  });

  it('pagina de 10 em 10 e guarda a página na URL', async () => {
    const aberto = abrir('/eventos?visao=lista', PERFIS.MEMBRO);
    cadastrarNoServidor(aberto.atender, 5);
    const { localizacao } = aberto;
    await screen.findByText('Mostrando 1–10 de 12');

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    await screen.findByText('Mostrando 11–12 de 12');
    expect(localizacao.atual.search).toBe('?visao=lista&pagina=2');
    expect(consultasDeEventos().at(-1)).toMatchObject({ page: 1 });
  });

  it('ordena por título pelo cabeçalho, com data e horário desempatando', async () => {
    const { localizacao } = abrir('/eventos?visao=lista', PERFIS.PASTOR);
    await esperarLista();

    fireEvent.click(within(within(tabela()).getByRole('columnheader', { name: 'Título' })).getByRole('button'));

    await waitFor(() => expect(titulosNaTabela()[0]).toBe('Ação social no bairro'));
    expect(localizacao.atual.search).toBe('?visao=lista&ordem=titulo%2Casc');
    expect(consultasDeEventos().at(-1).sort).toEqual(['titulo,asc', 'data,asc', 'horario,asc', 'id,asc']);
  });

  it('sem eventos: estado vazio próprio de cada perfil', async () => {
    abrir('/eventos?visao=lista&de=2000-01-01&ate=2000-01-31', PERFIS.MEMBRO);
    expect(await screen.findByRole('heading', { name: 'Nenhum evento no período' })).toBeTruthy();
    expect(screen.getByText('Nada agendado entre 01/01/2000 e 31/01/2000.')).toBeTruthy();
  });
});

describe('lista de eventos: filtro por período', () => {
  it('filtra pelas duas datas e guarda o período na URL', async () => {
    const aberto = abrir('/eventos?visao=lista', PERFIS.SECRETARIO);
    cadastrarNoServidor(aberto.atender, 2, { data: '2030-01-15' });
    await esperarLista();

    fireEvent.change(screen.getByLabelText('De'), { target: { value: '01012030' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '31012030' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));

    await waitFor(() => expect(titulosNaTabela()).toEqual(['Ensaio do coral 01', 'Ensaio do coral 02']));
    expect(aberto.localizacao.atual.search).toBe('?visao=lista&de=2030-01-01&ate=2030-01-31');
    expect(consultasDeEventos().at(-1)).toMatchObject({ dataInicio: '2030-01-01', dataFim: '2030-01-31', page: 0 });
    expect(screen.getByLabelText('De').value).toBe('01/01/2030');
  });

  it('com uma data só, avisa no campo e não consulta (o backend ignoraria o filtro)', async () => {
    const { localizacao } = abrir('/eventos?visao=lista', PERFIS.SECRETARIO);
    await esperarLista();
    const antes = consultasDeEventos().length;

    fireEvent.change(screen.getByLabelText('De'), { target: { value: '01012030' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));

    expect(await screen.findByText('Informe a data final (o filtro precisa das duas datas).')).toBeTruthy();
    expect(consultasDeEventos()).toHaveLength(antes);
    expect(localizacao.atual.search).toBe('?visao=lista');
  });

  it('"Limpar" tira o período da URL', async () => {
    const { localizacao } = abrir('/eventos?visao=lista&de=2030-01-01&ate=2030-01-31', PERFIS.SECRETARIO);
    await screen.findByRole('heading', { name: 'Nenhum evento no período' });

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    await esperarLista();
    expect(localizacao.atual.search).toBe('?visao=lista');
  });
});

describe('alternância calendário × lista', () => {
  it('abre no calendário do mês atual; a escolha da lista vai para a URL e o "voltar" da lista mantém a visão', async () => {
    const { localizacao } = abrir('/eventos', PERFIS.MEMBRO);
    expect(await screen.findByRole('heading', { name: formatarMesAno(mesDaData(HOJE)) })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Calendário' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));

    await esperarLista();
    expect(localizacao.atual.search).toBe('?visao=lista');
    expect(screen.getByRole('button', { name: 'Lista' }).getAttribute('aria-pressed')).toBe('true');

    // O link de detalhes leva a URL da lista para o "Voltar".
    fireEvent.click(within(tabela()).getByRole('link', { name: 'Culto de celebração' }));
    await screen.findByRole('heading', { name: 'Culto de celebração', level: 1 });
    fireEvent.click(screen.getByRole('link', { name: 'Voltar para os eventos' }));
    await esperarLista();
    expect(localizacao.atual.search).toBe('?visao=lista');
  });
});

describe('calendário mensal', () => {
  it('põe o evento no dia certo (sem escorregar de fuso) e o clique abre os detalhes', async () => {
    telaLarga();
    const mes = mesDaData(CELEBRACAO.data);
    const { localizacao } = abrir(`/eventos?mes=${mes}`, PERFIS.MEMBRO);

    const link = await screen.findByRole('link', { name: /19:00\s*Culto de celebração/ });
    expect(link.closest('li[data-data]').getAttribute('data-data')).toBe(CELEBRACAO.data);
    const { inicio, fim } = intervaloDaGrade(mes);
    expect(consultasDeEventos()[0]).toEqual({
      dataInicio: inicio,
      dataFim: fim,
      page: 0,
      size: 2000,
      sort: ['data,asc', 'horario,asc', 'id,asc'],
    });

    fireEvent.click(link);

    await screen.findByRole('heading', { name: 'Culto de celebração', level: 1 });
    expect(localizacao.atual.pathname).toBe(`/eventos/${CELEBRACAO.id}`);
  });

  it('navega entre meses pela URL e "Hoje" volta ao mês atual', async () => {
    telaLarga();
    const { localizacao } = abrir('/eventos', PERFIS.MEMBRO);
    const atual = mesDaData(HOJE);
    await screen.findByRole('heading', { name: formatarMesAno(atual) });

    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    await screen.findByRole('heading', { name: formatarMesAno(somarMeses(atual, 1)) });
    expect(localizacao.atual.search).toBe(`?mes=${somarMeses(atual, 1)}`);
    expect(consultasDeEventos().at(-1).dataInicio).toBe(intervaloDaGrade(somarMeses(atual, 1)).inicio);

    fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    await screen.findByRole('heading', { name: formatarMesAno(atual) });
    expect(localizacao.atual.search).toBe('');
  });

  it('quem pode criar vê o "+" de cada dia, que abre o cadastro já com a data', async () => {
    telaLarga();
    const mes = mesDaData(CELEBRACAO.data);
    abrir(`/eventos?mes=${mes}`, PERFIS.SECRETARIO);
    const novo = await screen.findByRole('link', { name: `Novo evento em ${formatarData(CELEBRACAO.data)}` });
    expect(novo.getAttribute('href')).toBe(`/eventos/novo?data=${CELEBRACAO.data}`);
  });

  it('no celular, o mês vira uma agenda por dia', async () => {
    const mes = mesDaData(CELEBRACAO.data);
    abrir(`/eventos?mes=${mes}`, PERFIS.MEMBRO);
    const dia = await screen.findByRole('heading', { name: formatarDataPorExtenso(CELEBRACAO.data), level: 3 });
    expect(within(dia.closest('li')).getByRole('link', { name: /Culto de celebração/ })).toBeTruthy();
  });
});

describe('ações por perfil na lista (RN09)', () => {
  it('ADMINISTRADOR edita e exclui qualquer evento, inclusive o encerrado', async () => {
    abrir('/eventos?visao=lista', PERFIS.ADMINISTRADOR);
    await esperarLista();
    const editar = within(linhaDo('Culto de ação de graças')).getByRole('link', { name: 'Editar Culto de ação de graças' });
    expect(editar.getAttribute('href')).toBe(`/eventos/${ENCERRADO.id}/editar`);
    expect(within(linhaDo('Culto de ação de graças')).getByRole('button', { name: 'Excluir Culto de ação de graças' })).toBeTruthy();
  });

  it('SECRETARIO: "Editar" do evento encerrado fica desabilitado com o motivo; sem "Excluir"', async () => {
    abrir('/eventos?visao=lista', PERFIS.SECRETARIO);
    await esperarLista();

    const bloqueado = within(linhaDo('Culto de ação de graças')).getByRole('button', { name: 'Editar Culto de ação de graças' });
    expect(bloqueado.getAttribute('aria-disabled')).toBe('true');
    expect(bloqueado.getAttribute('title')).toBe(MOTIVO_EVENTO_ENCERRADO);
    expect(document.getElementById(bloqueado.getAttribute('aria-describedby')).textContent).toBe(MOTIVO_EVENTO_ENCERRADO);

    expect(within(linhaDo('Culto de celebração')).getByRole('link', { name: 'Editar Culto de celebração' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Excluir/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Novo evento' })).toBeTruthy();
  });

  it('PASTOR e MEMBRO só consultam: sem "Novo evento", "Editar" nem "Excluir"', async () => {
    abrir('/eventos?visao=lista', PERFIS.PASTOR);
    await esperarLista();
    expect(screen.queryByRole('link', { name: 'Novo evento' })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Editar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Editar|^Excluir/ })).toBeNull();
  });

  it('TESOUREIRO consulta a agenda (GET é isAuthenticated()), sem nenhuma ação', async () => {
    abrir('/eventos?visao=lista', PERFIS.TESOUREIRO);
    await esperarLista();
    expect(titulosNaTabela()).toHaveLength(EVENTOS.length);
    expect(screen.queryByRole('link', { name: 'Novo evento' })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Editar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Editar|^Excluir/ })).toBeNull();
  });

  it('exclusão pela lista pede confirmação e atualiza a lista', async () => {
    abrir('/eventos?visao=lista', PERFIS.ADMINISTRADOR);
    await esperarLista();

    fireEvent.click(within(linhaDo('Culto de celebração')).getByRole('button', { name: 'Excluir Culto de celebração' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Excluir evento' });
    expect(dialogo.textContent).toContain(`${formatarData(CELEBRACAO.data)} às 19:00`);
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Excluir evento' }));

    await waitFor(() => expect(titulosNaTabela()).not.toContain('Culto de celebração'));
    expect(screen.getByText('Evento excluído.')).toBeTruthy();
  });
});
