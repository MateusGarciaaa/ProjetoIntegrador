import { describe, expect, it } from 'vitest';
import { ApiError, TIPOS_ERRO } from '../services/http/apiError';
import {
  formatarCampoMembro,
  mapearErroDoServidor,
  montarPayloadMembro,
  validarMembro,
  valoresIniciaisMembro,
} from './membroSchema';

const HOJE = '2026-09-30';

function valores(sobrescrever = {}) {
  return {
    ...valoresIniciaisMembro(),
    nome: 'Ana Beatriz Carvalho',
    cpf: '529.982.247-25',
    email: 'ana@igreja.org',
    ...sobrescrever,
  };
}

const validar = (v) => validarMembro(v, { hoje: HOJE });

describe('valoresIniciaisMembro', () => {
  it('começa vazio e com status ATIVO', () => {
    expect(valoresIniciaisMembro()).toEqual({
      nome: '',
      cpf: '',
      status: 'ATIVO',
      email: '',
      telefone: '',
      endereco: '',
      dataNascimento: '',
      dataConversao: '',
      dataBatismo: '',
    });
  });

  it('converte um MembroResponse aplicando as máscaras e trocando null por vazio', () => {
    const membro = {
      id: 'x',
      nome: 'Ana',
      cpf: '52998224725',
      email: 'ana@igreja.org',
      telefone: '45999120341',
      endereco: null,
      dataNascimento: '1988-03-14',
      dataBatismo: null,
      dataConversao: null,
      status: 'AFASTADO',
    };
    expect(valoresIniciaisMembro(membro)).toMatchObject({
      cpf: '529.982.247-25',
      telefone: '(45) 99912-0341',
      endereco: '',
      dataBatismo: '',
      status: 'AFASTADO',
    });
  });
});

describe('validarMembro', () => {
  it('aceita um cadastro mínimo válido', () => {
    expect(validar(valores())).toEqual({});
  });

  it('exige nome, CPF e e-mail (como o MembroRequest)', () => {
    expect(Object.keys(validar(valores({ nome: ' ', cpf: '', email: '' })))).toEqual(['nome', 'cpf', 'email']);
  });

  it('nome precisa de pelo menos 3 letras e no máximo 150 caracteres', () => {
    expect(validar(valores({ nome: 'Jo' })).nome).toBeDefined();
    expect(validar(valores({ nome: 'J. 1' })).nome).toBeDefined();
    expect(validar(valores({ nome: 'Íris' })).nome).toBeUndefined();
    expect(validar(valores({ nome: 'a'.repeat(151) })).nome).toMatch(/150/);
  });

  it('CPF precisa de 11 dígitos e dígito verificador válido', () => {
    expect(validar(valores({ cpf: '529.982.247' })).cpf).toMatch(/11 dígitos/);
    expect(validar(valores({ cpf: '529.982.247-24' })).cpf).toMatch(/não é válido/);
    expect(validar(valores({ cpf: '111.111.111-11' })).cpf).toMatch(/não é válido/);
  });

  it('e-mail com formato e tamanho de coluna', () => {
    expect(validar(valores({ email: 'ana@igreja' })).email).toBeDefined();
    expect(validar(valores({ email: `${'a'.repeat(145)}@x.org` })).email).toMatch(/150/);
  });

  it('telefone é opcional, mas se informado precisa de DDD e número', () => {
    expect(validar(valores({ telefone: '' })).telefone).toBeUndefined();
    expect(validar(valores({ telefone: '(45) 9991' })).telefone).toBeDefined();
    expect(validar(valores({ telefone: '(45) 3224-1876' })).telefone).toBeUndefined();
  });

  it('endereço respeita as 255 posições da coluna', () => {
    expect(validar(valores({ endereco: 'x'.repeat(256) })).endereco).toMatch(/255/);
  });

  it('status precisa existir no enum StatusMembro', () => {
    expect(validar(valores({ status: 'INATIVO' })).status).toBeDefined();
  });

  it('datas não podem estar no futuro nem ser inválidas', () => {
    const erros = validar(valores({ dataNascimento: '2026-10-01', dataBatismo: '2024-02-30' }));
    expect(erros.dataNascimento).toMatch(/futuro/);
    expect(erros.dataBatismo).toMatch(/válida/);
    expect(validar(valores({ dataNascimento: HOJE })).dataNascimento).toBeUndefined();
  });

  it('conversão e batismo não podem ser antes do nascimento', () => {
    const erros = validar(valores({ dataNascimento: '1990-05-10', dataConversao: '1990-05-09', dataBatismo: '1989-01-01' }));
    expect(erros.dataConversao).toMatch(/conversão/);
    expect(erros.dataBatismo).toMatch(/batismo/);
    expect(validar(valores({ dataNascimento: '1990-05-10', dataBatismo: '1990-05-10' }))).toEqual({});
  });
});

describe('montarPayloadMembro', () => {
  it('gera o MembroRequest com os nomes de campo da API', () => {
    const payload = montarPayloadMembro(
      valores({
        nome: '  Ana   Beatriz  ',
        email: ' Ana.Carvalho@Igreja.ORG ',
        telefone: '(45) 99912-0341',
        endereco: '  Rua Paraná,  1200 ',
        dataNascimento: '1988-03-14',
        status: 'VISITANTE',
      }),
    );
    expect(payload).toEqual({
      nome: 'Ana Beatriz',
      cpf: '52998224725',
      email: 'ana.carvalho@igreja.org',
      telefone: '45999120341',
      endereco: 'Rua Paraná, 1200',
      dataNascimento: '1988-03-14',
      dataBatismo: null,
      dataConversao: null,
      status: 'VISITANTE',
    });
  });

  it('campos opcionais vazios viram null', () => {
    const payload = montarPayloadMembro(valores({ telefone: '', endereco: '   ' }));
    expect(payload.telefone).toBeNull();
    expect(payload.endereco).toBeNull();
  });
});

describe('formatarCampoMembro', () => {
  it('aplica máscara só em CPF e telefone', () => {
    expect(formatarCampoMembro('cpf', '52998224725')).toBe('529.982.247-25');
    expect(formatarCampoMembro('telefone', '4532241876')).toBe('(45) 3224-1876');
    expect(formatarCampoMembro('nome', '529')).toBe('529');
  });
});

describe('mapearErroDoServidor', () => {
  const erro = (status, message, corpoApi = true) => new ApiError({ tipo: TIPOS_ERRO.CONFLITO, status, message, corpoApi });

  it('409 de e-mail vai para o campo email', () => {
    expect(mapearErroDoServidor(erro(409, 'Já existe um membro com este e-mail'))).toEqual({
      camposErro: { email: 'Já existe um membro com este e-mail' },
      erroGeral: null,
    });
  });

  it('409 de CPF vai para o campo cpf', () => {
    expect(mapearErroDoServidor(erro(409, 'Já existe um membro com este CPF')).camposErro).toEqual({
      cpf: 'Já existe um membro com este CPF',
    });
  });

  it('409 desconhecido vai para o topo do formulário', () => {
    expect(mapearErroDoServidor(erro(409, 'Registro duplicado'))).toEqual({ camposErro: {}, erroGeral: 'Registro duplicado' });
  });

  it('400 separa as mensagens juntadas pelo GlobalExceptionHandler', () => {
    const resultado = mapearErroDoServidor(
      erro(400, 'O CPF é obrigatório, O CPF deve conter 11 dígitos numéricos, E-mail inválido, Outra regra qualquer'),
    );
    expect(resultado).toEqual({
      camposErro: { cpf: 'O CPF é obrigatório', email: 'E-mail inválido' },
      erroGeral: 'Outra regra qualquer',
    });
  });

  it('demais erros (403, 500, rede) vão para o topo', () => {
    expect(mapearErroDoServidor(erro(403, 'Seu perfil não tem permissão para esta ação.'))).toEqual({
      camposErro: {},
      erroGeral: 'Seu perfil não tem permissão para esta ação.',
    });
  });
});
