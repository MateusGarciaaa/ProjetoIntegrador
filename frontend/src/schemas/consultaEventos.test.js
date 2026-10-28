import { describe, expect, it } from 'vitest';
import { criteriosOrdenacaoEventos, lerConsultaEventos, parametrosDaConsultaEventos, validarPeriodo } from './consultaEventos';

const HOJE = '2026-10-27';
const ler = (texto) => lerConsultaEventos(new URLSearchParams(texto), { hoje: HOJE });

describe('consulta de eventos na URL', () => {
  it('sem parâmetros: calendário no mês atual, lista sem período, ordenada por data', () => {
    expect(ler('')).toEqual({ visao: 'calendario', mes: '2026-10', de: '', ate: '', pagina: 0, campo: 'data', direcao: 'asc' });
  });

  it('lê visão, mês, período, página e ordem', () => {
    expect(ler('visao=lista&mes=2027-01&de=2026-11-01&ate=2026-11-30&pagina=3&ordem=titulo,desc')).toEqual({
      visao: 'lista',
      mes: '2027-01',
      de: '2026-11-01',
      ate: '2026-11-30',
      pagina: 2,
      campo: 'titulo',
      direcao: 'desc',
    });
  });

  it('valores inválidos voltam ao padrão em vez de virar 400 no backend', () => {
    expect(ler('visao=grade&mes=2026-13&pagina=-1&ordem=senha,asc')).toMatchObject({
      visao: 'calendario',
      mes: '2026-10',
      pagina: 0,
      campo: 'data',
    });
  });

  it('período só vale completo e em ordem (o backend ignora um limite sozinho)', () => {
    expect(ler('de=2026-11-01')).toMatchObject({ de: '', ate: '' });
    expect(ler('de=2026-11-30&ate=2026-11-01')).toMatchObject({ de: '', ate: '' });
    expect(ler('de=2026-02-30&ate=2026-03-01')).toMatchObject({ de: '', ate: '' });
    expect(ler('de=2026-11-05&ate=2026-11-05')).toMatchObject({ de: '2026-11-05', ate: '2026-11-05' });
  });

  it('volta para a URL sem os valores padrão', () => {
    const consulta = ler('');
    expect(parametrosDaConsultaEventos(consulta, { hoje: HOJE })).toEqual({});
    expect(
      parametrosDaConsultaEventos({ ...consulta, visao: 'lista', mes: '2026-12', de: '2026-11-01', ate: '2026-11-30', pagina: 1, direcao: 'desc' }, { hoje: HOJE }),
    ).toEqual({ visao: 'lista', mes: '2026-12', de: '2026-11-01', ate: '2026-11-30', pagina: '2', ordem: 'data,desc' });
  });
});

describe('criteriosOrdenacaoEventos', () => {
  it('por data, o horário segue a mesma direção e o id desempata', () => {
    expect(criteriosOrdenacaoEventos({ campo: 'data', direcao: 'asc' })).toEqual(['data,asc', 'horario,asc', 'id,asc']);
    expect(criteriosOrdenacaoEventos({ campo: 'data', direcao: 'desc' })).toEqual(['data,desc', 'horario,desc', 'id,asc']);
  });

  it('por título, a data e o horário desempatam', () => {
    expect(criteriosOrdenacaoEventos({ campo: 'titulo', direcao: 'desc' })).toEqual(['titulo,desc', 'data,asc', 'horario,asc', 'id,asc']);
  });
});

describe('validarPeriodo (filtro digitado)', () => {
  it('converte DD/MM/AAAA para ISO', () => {
    expect(validarPeriodo({ de: '01/11/2026', ate: '30/11/2026' })).toEqual({ periodo: { de: '2026-11-01', ate: '2026-11-30' }, erros: {} });
  });

  it('vazio limpa o período', () => {
    expect(validarPeriodo({ de: ' ', ate: '' })).toEqual({ periodo: { de: '', ate: '' }, erros: {} });
  });

  it('exige as duas datas, válidas e em ordem', () => {
    expect(validarPeriodo({ de: '01/11/2026', ate: '' }).erros).toEqual({ ate: 'Informe a data final (o filtro precisa das duas datas).' });
    expect(validarPeriodo({ de: '', ate: '30/11/2026' }).erros).toEqual({ de: 'Informe a data inicial (o filtro precisa das duas datas).' });
    expect(validarPeriodo({ de: '31/02/2026', ate: '30/11/2026' }).erros).toEqual({ de: 'Data inválida. Use DD/MM/AAAA.' });
    expect(validarPeriodo({ de: '30/11/2026', ate: '01/11/2026' })).toEqual({
      periodo: null,
      erros: { ate: 'A data final não pode ser antes da inicial.' },
    });
  });
});
