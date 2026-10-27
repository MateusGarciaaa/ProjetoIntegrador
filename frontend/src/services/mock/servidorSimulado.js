import { criarBanco } from './bancoEmMemoria';
import { ROTAS_AUTH } from './handlers/auth';
import { ROTAS_MEMBROS } from './handlers/membros';
import { verificarTokenFalso } from './mockJwt';
import { corpoInvalido, erroApi, MENSAGENS_BACKEND, naoAutenticado } from './respostas';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Espelha o permitAll("/api/v1/auth/**") do SecurityConfig. */
const PREFIXO_PUBLICO = '/auth/';

/**
 * Tabela de rotas do backend simulado. Cada módulo exporta as suas em handlers/<modulo>.js:
 *   { metodo, padrao (regex; o 1º grupo é o {id}), publica? | perfis (@PreAuthorize),
 *     parametros?(params) → mensagem de 400 ou null (conversão de @RequestParam),
 *     corpo?: { ilegivel(corpo), validar(corpo) → mensagens }, executar(contexto) }
 * Módulo novo = um arquivo de handlers + uma linha aqui.
 */
const ROTAS = [...ROTAS_AUTH, ...ROTAS_MEMBROS];

function autenticar(banco, cabecalhoAuthorization, agoraMs) {
  if (typeof cabecalhoAuthorization !== 'string' || !cabecalhoAuthorization.startsWith('Bearer ')) return null;
  const payload = verificarTokenFalso(cabecalhoAuthorization.slice(7), agoraMs);
  // O backend relê o usuário do banco a cada requisição (loadUserByUsername).
  return payload ? banco.usuarios.find((u) => u.email === payload.sub) ?? null : null;
}

/** Caminho conhecido com outro método → 405; caminho desconhecido → 404 (NoResourceFoundException). */
function rotaInexistente(metodo, caminho) {
  if (ROTAS.some((r) => r.padrao.test(caminho))) {
    return erroApi(405, `Método ${metodo.toUpperCase()} não suportado neste recurso.`, caminho);
  }
  return erroApi(404, MENSAGENS_BACKEND.RECURSO_INEXISTENTE, caminho);
}

/** @Valid: corpo ilegível (JSON, data, enum) → 400 fixo; regras violadas → mensagens unidas por ", ". */
function validarCorpo(rota, corpo, corpoMalformado, caminho) {
  if (!rota.corpo) return null;
  if (corpoMalformado || rota.corpo.ilegivel(corpo)) return corpoInvalido(caminho);
  const erros = rota.corpo.validar(corpo);
  return erros.length ? erroApi(400, erros.join(', '), caminho) : null;
}

/**
 * Cria um servidor com estado próprio. A ordem das verificações segue o Spring:
 * autenticação → conversão do {id} e dos parâmetros → @Valid do corpo → @PreAuthorize → serviço.
 */
export function criarServidorSimulado({ validadeTokenSegundos, relogio = () => Date.now() }) {
  const banco = criarBanco();

  return function atender({ metodo, url, params = {}, corpo = null, authorization = null, corpoMalformado = false }) {
    const caminho = url.split('?')[0];
    const agoraMs = relogio();
    const rota = ROTAS.find((r) => r.metodo === metodo && r.padrao.test(caminho));

    if (rota?.publica) {
      if (corpoMalformado) return corpoInvalido(caminho);
      return rota.executar({ banco, corpo, caminho, agoraMs, validadeSegundos: validadeTokenSegundos });
    }
    // Rota pública inexistente não exige token: o Spring responde 404/405 direto.
    if (caminho.startsWith(PREFIXO_PUBLICO)) return rotaInexistente(metodo, caminho);

    const usuario = autenticar(banco, authorization, agoraMs);
    if (!usuario) return naoAutenticado(caminho);
    if (!rota) return rotaInexistente(metodo, caminho);

    const id = rota.padrao.exec(caminho)[1];
    if (id !== undefined && !UUID.test(id)) return erroApi(400, "Valor inválido para o parâmetro 'id'.", caminho);

    const erroDeParametro = rota.parametros?.(params);
    if (erroDeParametro) return erroApi(400, erroDeParametro, caminho);

    const erroDeCorpo = validarCorpo(rota, corpo, corpoMalformado, caminho);
    if (erroDeCorpo) return erroDeCorpo;

    if (!rota.perfis.includes(usuario.perfil)) {
      return erroApi(403, 'Você não possui permissão para acessar este recurso.', caminho);
    }

    return rota.executar({ banco, id, corpo, params, caminho });
  };
}
