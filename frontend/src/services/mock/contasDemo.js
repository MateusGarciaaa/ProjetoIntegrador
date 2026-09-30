import { PERFIS } from '../../constants/perfis';

export const SENHA_DEMO = 'demo123';

/** Contas do modo demonstração, uma por perfil. */
export const CONTAS_DEMO = Object.freeze([
  { perfil: PERFIS.ADMINISTRADOR, nome: 'Helena Duarte', email: 'administrador@churchhub.local' },
  { perfil: PERFIS.SECRETARIO, nome: 'Marcos Tavares', email: 'secretario@churchhub.local' },
  { perfil: PERFIS.PASTOR, nome: 'Samuel Ribeiro', email: 'pastor@churchhub.local' },
  { perfil: PERFIS.TESOUREIRO, nome: 'Débora Lins', email: 'tesoureiro@churchhub.local' },
  { perfil: PERFIS.MEMBRO, nome: 'Tiago Moreira', email: 'membro@churchhub.local' },
]);
