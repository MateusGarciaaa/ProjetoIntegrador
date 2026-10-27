import { PERMISSOES, temPermissao } from './permissoes';
import { rotaInicialDoPerfil, ROTAS } from './rotas';

/** Itens do menu lateral, na ordem de exibição. Cada um some para quem não tem a permissão. */
export const ITENS_MENU = Object.freeze([
  { rotulo: 'Painel', caminho: ROTAS.DASHBOARD, icone: 'painel', permissao: PERMISSOES.DASHBOARD_VISUALIZAR },
  { rotulo: 'Membros', caminho: ROTAS.MEMBROS, icone: 'membros', permissao: PERMISSOES.MEMBROS_VISUALIZAR },
  { rotulo: 'Eventos', caminho: ROTAS.EVENTOS, icone: 'calendario', permissao: PERMISSOES.EVENTOS_VISUALIZAR },
  { rotulo: 'Financeiro', caminho: ROTAS.FINANCEIRO, icone: 'financeiro', permissao: PERMISSOES.FINANCEIRO_VISUALIZAR },
]);

export function itensMenuDoPerfil(perfil) {
  return ITENS_MENU.filter((item) => temPermissao(perfil, item.permissao));
}

/** Item do menu que corresponde ao caminho atual (inclui subcaminhos, ex.: /membros/123). */
export function itemMenuDoCaminho(caminho) {
  return ITENS_MENU.find((item) => caminho === item.caminho || caminho.startsWith(`${item.caminho}/`)) ?? null;
}

/**
 * Trilha "Início › Área" do caminho atual. Na própria rota inicial do perfil (ou num
 * caminho fora do menu, como o 404) não há trilha.
 */
export function trilhaDoCaminho(caminho, perfil) {
  const item = itemMenuDoCaminho(caminho);
  const inicio = rotaInicialDoPerfil(perfil);
  if (!item || caminho === inicio) return [];
  return [
    { rotulo: 'Início', caminho: inicio },
    { rotulo: item.rotulo, caminho: item.caminho },
  ];
}
