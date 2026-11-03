import { PERMISSOES, temPermissao } from './permissoes';
import { rotaInicialDoPerfil, ROTAS } from './rotas';

/** Itens do menu lateral, na ordem de exibição. Cada um some para quem não tem a permissão. */
export const ITENS_MENU = Object.freeze([
  { rotulo: 'Painel', caminho: ROTAS.DASHBOARD, icone: 'painel', permissao: PERMISSOES.DASHBOARD_VISUALIZAR },
  { rotulo: 'Membros', caminho: ROTAS.MEMBROS, icone: 'membros', permissao: PERMISSOES.MEMBROS_VISUALIZAR },
  { rotulo: 'Eventos', caminho: ROTAS.EVENTOS, icone: 'calendario', permissao: PERMISSOES.EVENTOS_VISUALIZAR },
  { rotulo: 'Financeiro', caminho: ROTAS.FINANCEIRO, icone: 'financeiro', permissao: PERMISSOES.FINANCEIRO_VISUALIZAR },
  { rotulo: 'Usuários', caminho: ROTAS.USUARIOS, icone: 'usuarios', permissao: PERMISSOES.USUARIOS_GERENCIAR },
  { rotulo: 'Minha conta', caminho: ROTAS.MINHA_CONTA, icone: 'conta', permissao: PERMISSOES.CONTA_GERENCIAR },
]);

export function itensMenuDoPerfil(perfil) {
  return ITENS_MENU.filter((item) => temPermissao(perfil, item.permissao));
}

/** Item do menu que corresponde ao caminho atual (inclui subcaminhos, ex.: /membros/123). */
export function itemMenuDoCaminho(caminho) {
  return ITENS_MENU.find((item) => caminho === item.caminho || caminho.startsWith(`${item.caminho}/`)) ?? null;
}

/** Subpáginas com nome próprio (abas do Financeiro). */
const ROTULOS_DE_SUBPAGINA = Object.freeze({
  [ROTAS.FLUXO_DE_CAIXA]: 'Fluxo de caixa',
  [ROTAS.RELATORIO_FINANCEIRO]: 'Relatório',
});

/** Rótulo do último nível da trilha em subpáginas: /area/novo, /area/:id, /area/:id/editar e as de nome próprio. */
function rotuloDaSubpagina(caminho, item) {
  if (caminho === item.caminho) return null;
  if (ROTULOS_DE_SUBPAGINA[caminho]) return ROTULOS_DE_SUBPAGINA[caminho];
  if (caminho.endsWith('/novo')) return 'Novo';
  if (caminho.endsWith('/editar')) return 'Editar';
  return 'Detalhes';
}

/**
 * Trilha "Início › Área [› Subpágina]" do caminho atual. Na própria rota inicial do perfil
 * (ou num caminho fora do menu, como o 404) não há trilha; quando a área já é o início do
 * perfil, o "Início" não se repete.
 */
export function trilhaDoCaminho(caminho, perfil) {
  const item = itemMenuDoCaminho(caminho);
  if (!item) return [];
  const inicio = rotaInicialDoPerfil(perfil);
  const subpagina = rotuloDaSubpagina(caminho, item);
  if (!subpagina && caminho === inicio) return [];

  return [
    ...(item.caminho === inicio ? [] : [{ rotulo: 'Início', caminho: inicio }]),
    { rotulo: item.rotulo, caminho: item.caminho },
    ...(subpagina ? [{ rotulo: subpagina }] : []),
  ];
}
