import { STATUS_MEMBRO } from '../../constants/statusMembro';
import { calcularDigitosVerificadoresCpf } from '../../utils/cpf';

const { ATIVO, AFASTADO, VISITANTE } = STATUS_MEMBRO;

/** [nome, e-mail, telefone, endereço, nascimento, conversão, batismo, status, base do CPF] */
const REGISTROS = [
  ['Ana Beatriz Carvalho', 'ana.carvalho@email.com', '45999120341', 'Rua Paraná, 1200 - Centro, Cascavel/PR', '1988-03-14', '2004-06-20', '2005-01-09', ATIVO, '529982247'],
  ['André Luiz Fontana', 'andre.fontana@email.com', '45998230112', 'Av. Brasil, 5430 - Centro, Cascavel/PR', '1979-11-02', '1999-08-15', '2000-02-27', ATIVO, '111444777'],
  ['Bruna Kessler', 'bruna.kessler@email.com', '4532241876', 'Rua Souza Naves, 88 - Country, Cascavel/PR', '1995-07-23', null, null, VISITANTE, '248438073'],
  ['Caio Henrique Mendes', 'caio.mendes@email.com', '45991874520', null, '2001-01-30', '2018-04-01', '2018-11-18', ATIVO, '390533447'],
  ['Camila Rocha Prado', 'camila.prado@email.com', '45988012233', 'Rua Recife, 310 - Neva, Cascavel/PR', '1990-09-05', '2010-03-12', '2010-12-05', AFASTADO, '153509460'],
  ['Daniel Schmitt', 'daniel.schmitt@email.com', null, 'Rua Minas Gerais, 77 - Cancelli, Cascavel/PR', '1984-12-19', '2002-05-26', '2003-07-13', ATIVO, '935411347'],
  ['Eduarda Nogueira', 'eduarda.nogueira@email.com', '45999553017', 'Rua Carlos Gomes, 2150 - Centro, Cascavel/PR', '1999-04-11', '2015-09-06', '2016-03-20', ATIVO, '071852946'],
  ['Elias Bortolini', 'elias.bortolini@email.com', '45984442210', null, '1967-06-28', '1985-01-13', '1985-10-06', ATIVO, '286741903'],
  ['Fernanda Luz Almeida', 'fernanda.almeida@email.com', '45991002287', 'Rua Rio de Janeiro, 945 - Centro, Cascavel/PR', '1993-02-17', null, null, VISITANTE, '604115820'],
  ['Gabriel Antunes', 'gabriel.antunes@email.com', '45987761134', 'Rua Pernambuco, 1502 - Alto Alegre, Cascavel/PR', '2003-10-08', '2019-12-15', null, ATIVO, '817326559'],
  ['Heloísa Martins', 'heloisa.martins@email.com', '4532256641', 'Rua Manaus, 430 - Canadá, Cascavel/PR', '1975-05-21', '1993-07-18', '1994-01-30', AFASTADO, '462093718'],
  ['Igor Vasconcelos', 'igor.vasconcelos@email.com', '45998870093', null, '1998-08-14', '2016-02-07', '2016-08-21', ATIVO, '739250164'],
  ['Isadora Pacheco', 'isadora.pacheco@email.com', '45999014488', 'Rua Uruguai, 610 - Pioneiros Catarinenses, Cascavel/PR', '2005-12-01', null, null, VISITANTE, '385617042'],
  ['João Pedro Zanella', 'joao.zanella@email.com', '45984120976', 'Av. Tancredo Neves, 3120 - Alto Alegre, Cascavel/PR', '1982-03-09', '2000-10-22', '2001-04-15', ATIVO, '920471385'],
  ['Juliana Ferraz', 'juliana.ferraz@email.com', '45991337620', 'Rua Fortaleza, 225 - Periollo, Cascavel/PR', '1991-06-26', '2009-11-01', '2010-05-23', ATIVO, '146829573'],
  ['Lucas Moraes Teixeira', 'lucas.teixeira@email.com', null, null, '1996-01-12', '2013-08-18', '2014-02-09', AFASTADO, '573904218'],
  ['Luíza Bernardes', 'luiza.bernardes@email.com', '45988456710', 'Rua Salgado Filho, 1777 - Centro, Cascavel/PR', '1986-10-30', '2003-04-27', '2003-12-14', ATIVO, '208357691'],
  ['Mateus Oliveira Cruz', 'mateus.cruz@email.com', '45999781203', 'Rua Jorge Lacerda, 540 - Centro, Cascavel/PR', '1973-09-16', '1990-06-03', '1991-02-17', ATIVO, '694183052'],
  ['Natália Guedes', 'natalia.guedes@email.com', '45987220345', 'Rua Belém, 98 - Coqueiral, Cascavel/PR', '2000-11-25', '2017-05-14', '2017-10-29', ATIVO, '351726840'],
  ['Otávio Pereira', 'otavio.pereira@email.com', '4530371190', null, '1962-02-04', '1980-09-21', '1981-03-08', AFASTADO, '812645379'],
  ['Priscila Andrade', 'priscila.andrade@email.com', '45991648832', 'Rua Castro Alves, 1340 - Centro, Cascavel/PR', '1989-07-07', '2007-01-28', '2007-08-19', ATIVO, '467092135'],
  ['Rafael Siqueira', 'rafael.siqueira@email.com', '45998005521', 'Rua Maranhão, 2201 - Santa Cruz, Cascavel/PR', '1994-04-19', null, null, VISITANTE, '239581476'],
  ['Sabrina Toledo', 'sabrina.toledo@email.com', '45984991067', 'Rua Goiás, 815 - Maria Luiza, Cascavel/PR', '1981-08-03', '1998-03-15', '1998-11-01', ATIVO, '705318264'],
  ['Thiago Lemos', 'thiago.lemos@email.com', '45999360754', null, '1997-12-22', '2014-10-12', '2015-04-26', ATIVO, '184076925'],
  ['Vitória Campos Reis', 'vitoria.reis@email.com', '45988674419', 'Rua Rui Barbosa, 460 - Centro, Cascavel/PR', '2002-05-09', '2020-07-05', '2021-01-17', ATIVO, '958203617'],
];

function gerarId(indice) {
  return `7c0e6a1e-5b2f-4d6a-9f3e-${String(indice + 1).padStart(12, '0')}`;
}

/** Membros de exemplo, todos com CPF de dígito verificador válido. */
export function criarMembrosIniciais() {
  return REGISTROS.map(([nome, email, telefone, endereco, dataNascimento, dataConversao, dataBatismo, status, baseCpf], indice) => ({
    id: gerarId(indice),
    nome,
    cpf: baseCpf + calcularDigitosVerificadoresCpf(baseCpf),
    email,
    telefone,
    endereco,
    dataNascimento,
    dataBatismo,
    dataConversao,
    status,
  }));
}
