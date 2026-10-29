import { CONTAS_DEMO, SENHA_DEMO } from './contasDemo';
import { criarCategoriasIniciais, criarEventosIniciais, criarMembrosIniciais, criarMovimentacoesIniciais } from './dadosIniciais';

/**
 * Estado do backend simulado. Recarregar a página volta aos dados iniciais.
 * hoje (AAAA-MM-DD, no fuso do servidor) posiciona os eventos e as movimentações de demonstração,
 * como o DadosDemonstracaoService faz com o Clock da aplicação.
 */
export function criarBanco({ hoje } = {}) {
  const membros = criarMembrosIniciais();
  const categorias = criarCategoriasIniciais();
  return {
    usuarios: CONTAS_DEMO.map((conta) => ({ ...conta, senha: SENHA_DEMO, ativo: true })),
    membros,
    eventos: hoje ? criarEventosIniciais(hoje) : [],
    categorias,
    // RN14 (membro com movimentação não pode ser excluído) consulta esta coleção, como o existsByMembroId.
    movimentacoes: hoje ? criarMovimentacoesIniciais(hoje, categorias, membros) : [],
    tokensRedefinicao: [],
  };
}

let sequencia = 0;

/** randomUUID só existe em contexto seguro (https ou localhost); fora dele, usa uma sequência. */
export function novoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  sequencia += 1;
  return `00000000-0000-4000-8000-${String(sequencia).padStart(12, '0')}`;
}
