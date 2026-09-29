import { MEMBER_STATUS } from '../../constants/memberStatus';

const { ATIVO, AFASTADO, VISITANTE } = MEMBER_STATUS;

const SEED = [
  ['Maria Aparecida Souza', '52601815906', 'maria.souza@email.com', '11987654321', '1968-03-14', '1990-06-10', '1989-11-02', ATIVO],
  ['João Pedro Almeida', '08301661305', 'joao.almeida@email.com', '21998761234', '1995-07-22', '2012-04-08', '2011-09-15', ATIVO],
  ['Ana Clara Ferreira', '18609139034', 'ana.ferreira@email.com', '41991234567', '2001-01-30', null, '2019-02-17', ATIVO],
  ['Carlos Eduardo Lima', null, 'carlos.lima@email.com', '11976543210', '1982-10-05', '2005-12-11', '2004-08-01', AFASTADO],
  ['Débora Nogueira', '99603082430', 'debora.nogueira@email.com', null, '1990-05-19', '2008-03-23', '2007-07-07', ATIVO],
  ['Elias Santana', null, 'elias.santana@email.com', '21987650011', null, null, null, VISITANTE],
  ['Fernanda Rocha', '62819482112', 'fernanda.rocha@email.com', '41999887766', '1976-12-01', '1998-09-27', '1997-05-30', ATIVO],
  ['Gabriel Martins', '99351819019', 'gabriel.martins@email.com', '1133224455', '2004-08-16', '2020-11-29', '2020-01-12', ATIVO],
  ['Helena Castro', null, 'helena.castro@email.com', '11955443322', '1959-02-25', '1980-04-06', '1979-10-10', ATIVO],
  ['Isaque Barbosa', '93786579741', 'isaque.barbosa@email.com', '21966554433', '1999-09-09', null, null, VISITANTE],
  ['Júlia Mendes', '54323194897', 'julia.mendes@email.com', '41988776655', '1987-06-03', '2010-08-15', '2009-12-24', AFASTADO],
  ['Lucas Oliveira', null, 'lucas.oliveira@email.com', '11944332211', '1993-11-11', '2015-05-17', '2014-03-09', ATIVO],
  ['Marta Vieira', null, 'marta.vieira@email.com', null, '1971-04-28', '1995-10-01', '1994-06-18', ATIVO],
];

export function createMemberSeed() {
  return SEED.map(([name, cpf, email, phone, birthDate, baptismDate, conversionDate, status]) => ({
    id: crypto.randomUUID(),
    name,
    cpf,
    email,
    phone,
    address: null,
    birthDate,
    baptismDate,
    conversionDate,
    status,
  }));
}
