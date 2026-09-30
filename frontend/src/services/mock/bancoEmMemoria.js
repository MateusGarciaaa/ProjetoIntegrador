import { CONTAS_DEMO, SENHA_DEMO } from './contasDemo';
import { criarMembrosIniciais } from './dadosIniciais';

/** Estado do backend simulado. Recarregar a página volta aos dados iniciais. */
export function criarBanco() {
  return {
    usuarios: CONTAS_DEMO.map((conta) => ({ ...conta, senha: SENHA_DEMO, ativo: true })),
    membros: criarMembrosIniciais(),
  };
}

let sequencia = 0;

/** randomUUID só existe em contexto seguro (https ou localhost); fora dele, usa uma sequência. */
export function novoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  sequencia += 1;
  return `00000000-0000-4000-8000-${String(sequencia).padStart(12, '0')}`;
}
