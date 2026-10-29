import { FUSO_HORARIO_SERVIDOR } from '../../constants/eventos';
import { agoraNoFuso } from '../../utils/datas';
import { CONTAS_DEMO, SENHA_DEMO } from './contasDemo';
import {
  criarCategoriasIniciais,
  criarEventosIniciais,
  criarMembrosIniciais,
  criarMovimentacoesIniciais,
  QUANTIDADE_NOVOS_MEMBROS_DEMO,
} from './dadosIniciais';

/** LocalDateTime do servidor ("AAAA-MM-DDTHH:mm:ss", fuso da igreja), como o Clock da aplicação. */
export function dataHoraDoServidor(agoraMs) {
  const { data, horario } = agoraNoFuso(FUSO_HORARIO_SERVIDOR, new Date(agoraMs));
  return `${data}T${horario}`;
}

/**
 * Estado do backend simulado. Recarregar a página volta aos dados iniciais.
 * hoje (AAAA-MM-DD, no fuso da igreja) posiciona os eventos e as movimentações de demonstração,
 * como o DadosDemonstracaoService faz com o Clock da aplicação; os últimos membros ganham a data
 * de cadastro da carga ("Novos membros") e os demais ficam com null.
 *   agora: "AAAA-MM-DDTHH:mm:ss" da carga (padrão: o início de hoje).
 */
export function criarBanco({ hoje, agora = hoje ? `${hoje}T00:00:00` : null } = {}) {
  const iniciais = criarMembrosIniciais();
  const membros = iniciais.map((membro, indice) => ({
    ...membro,
    criadoEm: agora && indice >= iniciais.length - QUANTIDADE_NOVOS_MEMBROS_DEMO ? agora : null,
  }));
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
