/** Perfis cadastrados na migration V1 (tabela perfis). */
export const PERFIS = Object.freeze({
  ADMINISTRADOR: 'ADMINISTRADOR',
  PASTOR: 'PASTOR',
  SECRETARIO: 'SECRETARIO',
  TESOUREIRO: 'TESOUREIRO',
  MEMBRO: 'MEMBRO',
});

/** O Spring Security grava a autoridade como "ROLE_" + nome do perfil. */
export const PREFIXO_ROLE = 'ROLE_';

const ROTULOS = Object.freeze({
  [PERFIS.ADMINISTRADOR]: 'Administrador',
  [PERFIS.PASTOR]: 'Pastor',
  [PERFIS.SECRETARIO]: 'Secretário',
  [PERFIS.TESOUREIRO]: 'Tesoureiro',
  [PERFIS.MEMBRO]: 'Membro',
});

export function rotuloPerfil(perfil) {
  return ROTULOS[perfil] ?? 'Perfil não reconhecido';
}
