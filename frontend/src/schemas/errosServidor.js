/**
 * SOLUÇÃO PROVISÓRIA — depende do TEXTO das mensagens do backend.
 *
 * O GlobalExceptionHandler não informa a qual campo cada erro pertence: em 400 ele junta
 * as mensagens das anotações do DTO com ", " numa única string, e em 409 manda só a
 * mensagem do serviço. Por isso o campo é deduzido do texto: se o backend mudar uma
 * mensagem, o erro deixa de aparecer ao lado do campo e passa para o topo do formulário
 * (nada quebra, mas a experiência piora). Quando o backend devolver erros estruturados
 * (pendência em docs/frontend-integracao.md), este mapeador passa a lê-los diretamente.
 */

const SEPARADOR_BACKEND = ', ';

function camposDaValidacao(mensagem, campoPorMensagem) {
  const partes = mensagem.split(SEPARADOR_BACKEND).map((parte) => parte.trim());
  const camposErro = {};
  const naoReconhecidas = [];

  partes.forEach((parte) => {
    const campo = campoPorMensagem[parte];
    if (!campo) naoReconhecidas.push(parte);
    else if (!camposErro[campo]) camposErro[campo] = parte;
  });

  // Nenhuma parte conhecida: a vírgula era do próprio texto (ex.: "Confira o JSON, as datas…").
  if (Object.keys(camposErro).length === 0) return { camposErro: {}, erroGeral: mensagem };
  return { camposErro, erroGeral: naoReconhecidas.length ? naoReconhecidas.join(SEPARADOR_BACKEND) : null };
}

function campoDoConflito(mensagem, campoPorConflito) {
  return campoPorConflito.find(({ padrao }) => padrao.test(mensagem))?.campo ?? null;
}

/**
 * Cria a função (apiError) => { camposErro: { campo: mensagem }, erroGeral } de um formulário.
 *   campoPorMensagem: { 'Mensagem exata da anotação do DTO': 'campo' }
 *   campoPorConflito: [{ padrao: /regex na mensagem do 409/, campo: 'campo' }]
 * O que não for reconhecido vai para erroGeral, exibido no topo do formulário.
 */
export function criarMapeadorDeErros({ campoPorMensagem = {}, campoPorConflito = [] } = {}) {
  return function mapear(erro) {
    if (erro.status === 409) {
      const campo = campoDoConflito(erro.message, campoPorConflito);
      return campo ? { camposErro: { [campo]: erro.message }, erroGeral: null } : { camposErro: {}, erroGeral: erro.message };
    }
    if (erro.status === 400 && erro.corpoApi) return camposDaValidacao(erro.message, campoPorMensagem);
    return { camposErro: {}, erroGeral: erro.message };
  };
}
