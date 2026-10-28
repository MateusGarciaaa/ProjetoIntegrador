import { CONTAS_DEMO, SENHA_DEMO } from './contasDemo';
import { criarEventosIniciais, criarMembrosIniciais, idsComMovimentacao } from './dadosIniciais';

/**
 * Estado do backend simulado. Recarregar a página volta aos dados iniciais.
 * hoje (AAAA-MM-DD, no fuso do servidor) posiciona os eventos de demonstração, como o
 * DadosDemonstracaoService faz com LocalDate.now().
 */
export function criarBanco({ hoje } = {}) {
  const membros = criarMembrosIniciais();
  return {
    usuarios: CONTAS_DEMO.map((conta) => ({ ...conta, senha: SENHA_DEMO, ativo: true })),
    membros,
    // Ids de membros com movimentação financeira (RN14). Vira consulta às movimentações quando o mock tiver o Financeiro.
    membrosComMovimentacao: idsComMovimentacao(membros),
    eventos: hoje ? criarEventosIniciais(hoje) : [],
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
