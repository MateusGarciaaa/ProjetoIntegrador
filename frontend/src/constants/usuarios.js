import { PERFIS, rotuloPerfil } from './perfis';

/** Tamanhos das colunas de usuarios (V1), repetidos nos @Size do UsuarioCadastroRequest. */
export const LIMITES_USUARIO = Object.freeze({ nome: 150, email: 150 });

export const TAMANHO_PAGINA_USUARIOS = 10;

/** Espera depois da digitação antes de buscar por nome (a mesma da lista de membros). */
export const ATRASO_BUSCA_USUARIOS_MS = 400;

/**
 * Perfis que o administrador pode atribuir (RN01: exatamente um). São os do enum NomePerfil;
 * Líder fica para a Fase 2 e não é oferecido (o backend recusaria com 400).
 */
export const OPCOES_PERFIL = Object.freeze(Object.values(PERFIS).map((perfil) => ({ valor: perfil, rotulo: rotuloPerfil(perfil) })));

/** Filtro de situação da lista: vira o parâmetro ativo=true|false do GET /users. */
export const SITUACOES_USUARIO = Object.freeze({ ATIVOS: 'ativos', INATIVOS: 'inativos' });

export const OPCOES_SITUACAO = Object.freeze([
  { valor: SITUACOES_USUARIO.ATIVOS, rotulo: 'Ativos' },
  { valor: SITUACOES_USUARIO.INATIVOS, rotulo: 'Inativos' },
]);
