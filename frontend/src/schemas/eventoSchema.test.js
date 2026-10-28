import { describe, expect, it } from 'vitest';
import { ApiError, TIPOS_ERRO } from '../services/http/apiError';
import { formatarCampoEvento, mapearErroDoServidor, montarPayloadEvento, validarEvento, valoresIniciaisEvento } from './eventoSchema';
import { MENSAGEM_RN09_BACKEND } from './regrasEvento';

const VALIDO = { titulo: 'Culto de celebração', data: '05/11/2026', horario: '19:30', local: '', descricao: '' };

function erro400(message) {
  return new ApiError({ tipo: TIPOS_ERRO.VALIDACAO, status: 400, message, corpoApi: true });
}

describe('RN08: data obrigatória', () => {
  it('sem data, o evento não passa (mesma regra do @NotNull do EventoRequest)', () => {
    expect(validarEvento({ ...VALIDO, data: '' }).data).toBe('Informe a data do evento.');
    expect(validarEvento({ ...VALIDO, data: '   ' }).data).toBe('Informe a data do evento.');
  });

  it('data incompleta ou inexistente também não passa', () => {
    ['05/11', '05/11/26', '31/02/2026', '00/01/2026', '32/12/2026'].forEach((data) =>
      expect(validarEvento({ ...VALIDO, data }).data).toBe('Informe uma data válida, no formato DD/MM/AAAA.'),
    );
  });

  it('data no passado é aceita, como no backend (que não a recusa)', () => {
    expect(validarEvento({ ...VALIDO, data: '01/01/2020' })).toEqual({});
  });
});

describe('demais regras do EventoRequest', () => {
  it('formulário válido não tem erros', () => {
    expect(validarEvento(VALIDO)).toEqual({});
  });

  it('título e horário obrigatórios', () => {
    const erros = validarEvento({ ...VALIDO, titulo: '  ', horario: '' });
    expect(erros).toEqual({ titulo: 'Informe o título.', horario: 'Informe o horário.' });
  });

  it('horário no formato 24 h', () => {
    ['24:00', '19:60', '19:3', '7'].forEach((horario) =>
      expect(validarEvento({ ...VALIDO, horario }).horario).toBe('Informe um horário válido, no formato HH:MM (24 horas).'),
    );
  });

  it('limites de 150, 255 e 1000 caracteres', () => {
    const erros = validarEvento({ ...VALIDO, titulo: 'a'.repeat(151), local: 'b'.repeat(256), descricao: 'c'.repeat(1001) });
    expect(erros).toEqual({
      titulo: 'Use no máximo 150 caracteres.',
      local: 'Use no máximo 255 caracteres.',
      descricao: 'Use no máximo 1000 caracteres.',
    });
    expect(validarEvento({ ...VALIDO, titulo: 'a'.repeat(150), local: 'b'.repeat(255), descricao: 'c'.repeat(1000) })).toEqual({});
  });
});

describe('máscaras e valores iniciais', () => {
  it('data e horário ganham máscara na digitação; texto livre fica como está', () => {
    expect(formatarCampoEvento('data', '05112026')).toBe('05/11/2026');
    expect(formatarCampoEvento('horario', '1930')).toBe('19:30');
    expect(formatarCampoEvento('titulo', ' Culto ')).toBe(' Culto ');
  });

  it('EventoResponse → formulário, sem perder nem ganhar um dia, e horário sem segundos', () => {
    const evento = { id: '1', titulo: 'Culto', descricao: null, data: '2026-01-01', horario: '19:00:00', local: null };
    expect(valoresIniciaisEvento(evento)).toEqual({ titulo: 'Culto', data: '01/01/2026', horario: '19:00', local: '', descricao: '' });
  });

  it('evento novo pode vir com a data do dia clicado no calendário', () => {
    expect(valoresIniciaisEvento(null, { dataSugerida: '2026-11-05' }).data).toBe('05/11/2026');
    expect(valoresIniciaisEvento(null).data).toBe('');
  });
});

describe('montarPayloadEvento', () => {
  it('envia exatamente o que foi digitado: data ISO e horário HH:mm, sem fuso', () => {
    expect(montarPayloadEvento(VALIDO)).toEqual({
      titulo: 'Culto de celebração',
      descricao: null,
      data: '2026-11-05',
      horario: '19:30',
      local: null,
    });
  });

  it('apara espaços e mantém as quebras de linha da descrição', () => {
    const payload = montarPayloadEvento({ ...VALIDO, titulo: '  Culto   de  jovens ', local: ' Salão ', descricao: ' Louvor\nPalavra ' });
    expect(payload).toMatchObject({ titulo: 'Culto de jovens', local: 'Salão', descricao: 'Louvor\nPalavra' });
  });
});

describe('mapearErroDoServidor', () => {
  it('mensagens do @Valid vão para o campo', () => {
    const { camposErro, erroGeral } = mapearErroDoServidor(erro400('O título é obrigatório, A data é obrigatória'));
    expect(camposErro).toEqual({ titulo: 'O título é obrigatório', data: 'A data é obrigatória' });
    expect(erroGeral).toBeNull();
  });

  it('o 409 da RN09 não é de campo: vai para o topo', () => {
    const rn09 = new ApiError({ tipo: TIPOS_ERRO.CONFLITO, status: 409, message: MENSAGEM_RN09_BACKEND, corpoApi: true });
    expect(mapearErroDoServidor(rn09)).toEqual({ camposErro: {}, erroGeral: MENSAGEM_RN09_BACKEND });
  });
});
