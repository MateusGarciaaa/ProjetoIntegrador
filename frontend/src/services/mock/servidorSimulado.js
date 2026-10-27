import { PERFIS } from '../../constants/perfis';
import { criarBanco } from './bancoEmMemoria';
import * as auth from './handlers/auth';
import * as membros from './handlers/membros';
import { verificarTokenFalso } from './mockJwt';
import { corpoInvalido, erroApi, MENSAGENS_BACKEND, naoAutenticado } from './respostas';

const { ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO } = PERFIS;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tabela de rotas do backend simulado. "perfis" repete os @PreAuthorize do
 * MembroController de forma independente da matriz do frontend, como o backend real.
 */
const ROTAS = [
  { metodo: 'post', padrao: /^\/auth\/login$/, publica: true, executar: auth.login },
  { metodo: 'get', padrao: /^\/members$/, perfis: [ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO], executar: membros.listar },
  { metodo: 'post', padrao: /^\/members$/, perfis: [ADMINISTRADOR, SECRETARIO], validarCorpo: true, executar: membros.cadastrar },
  { metodo: 'get', padrao: /^\/members\/([^/]+)$/, perfis: [ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO], executar: membros.buscarPorId },
  { metodo: 'put', padrao: /^\/members\/([^/]+)$/, perfis: [ADMINISTRADOR, SECRETARIO], validarCorpo: true, executar: membros.atualizar },
  { metodo: 'delete', padrao: /^\/members\/([^/]+)$/, perfis: [ADMINISTRADOR], executar: membros.excluir },
];

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

/**
 * Cria um servidor com estado próprio. A ordem das verificações segue o Spring:
 * autenticação → conversão do {id} → @Valid do corpo → @PreAuthorize → serviço.
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

    const usuario = autenticar(banco, authorization, agoraMs);
    if (!usuario) return naoAutenticado(caminho);
    if (!rota) return rotaInexistente(metodo, caminho);

    const id = rota.padrao.exec(caminho)[1];
    if (id !== undefined && !UUID.test(id)) return erroApi(400, "Valor inválido para o parâmetro 'id'.", caminho);

    if (rota.validarCorpo) {
      if (corpoMalformado || membros.corpoIlegivel(corpo)) return corpoInvalido(caminho);
      const erros = membros.validarMembroRequest(corpo);
      if (erros.length) return erroApi(400, erros.join(', '), caminho);
    }

    if (!rota.perfis.includes(usuario.perfil)) {
      return erroApi(403, 'Você não possui permissão para acessar este recurso.', caminho);
    }

    return rota.executar({ banco, id, corpo, params, caminho });
  };
}
