import { LIMITES_EVENTO } from '../constants/eventos';
import { dataBrParaIso, formatarData, formatarDataDigitada, formatarHorario, formatarHorarioDigitado, isHorarioValido } from '../utils/datas';
import { normalizarEspacos, vazioParaNull } from '../utils/strings';
import { criarMapeadorDeErros } from './errosServidor';

/** Os campos têm os mesmos nomes do EventoRequest, na ordem da tela. */
export const CAMPOS_EVENTO = Object.freeze(['titulo', 'data', 'horario', 'local', 'descricao']);

/** Tamanho de uma data completa digitada (DD/MM/AAAA) e de um horário (HH:mm). */
export const TAMANHO_DATA_MASCARADA = 10;
export const TAMANHO_HORARIO_MASCARADO = 5;

/**
 * Valores do formulário (sempre texto; data em DD/MM/AAAA, horário em HH:mm) a partir de um
 * EventoResponse, ou vazios. dataSugerida (ISO) preenche a data de um evento novo (dia clicado no calendário).
 */
export function valoresIniciaisEvento(evento, { dataSugerida = null } = {}) {
  return {
    titulo: evento?.titulo ?? '',
    data: formatarData(evento?.data ?? dataSugerida),
    horario: formatarHorario(evento?.horario),
    local: evento?.local ?? '',
    descricao: evento?.descricao ?? '',
  };
}

/** Máscaras aplicadas na digitação. */
export function formatarCampoEvento(campo, valor) {
  if (campo === 'data') return formatarDataDigitada(valor);
  if (campo === 'horario') return formatarHorarioDigitado(valor);
  return valor;
}

function excede(valor, limite) {
  return valor.length > limite ? `Use no máximo ${limite} caracteres.` : null;
}

function validarTitulo(valor) {
  const titulo = normalizarEspacos(valor);
  if (!titulo) return 'Informe o título.';
  return excede(titulo, LIMITES_EVENTO.titulo);
}

/** RN08: todo evento precisa de data (@NotNull no EventoRequest). Data no passado é aceita, como no backend. */
function validarData(valor) {
  const texto = valor.trim();
  if (!texto) return 'Informe a data do evento.';
  if (!dataBrParaIso(texto)) return 'Informe uma data válida, no formato DD/MM/AAAA.';
  return null;
}

function validarHorario(valor) {
  const texto = valor.trim();
  if (!texto) return 'Informe o horário.';
  if (!isHorarioValido(texto)) return 'Informe um horário válido, no formato HH:MM (24 horas).';
  return null;
}

/** Devolve { campo: mensagem } só com os campos inválidos. */
export function validarEvento(valores) {
  const erros = {
    titulo: validarTitulo(valores.titulo),
    data: validarData(valores.data),
    horario: validarHorario(valores.horario),
    local: excede(normalizarEspacos(valores.local), LIMITES_EVENTO.local),
    descricao: excede(valores.descricao.trim(), LIMITES_EVENTO.descricao),
  };
  return Object.fromEntries(Object.entries(erros).filter(([, mensagem]) => mensagem));
}

/**
 * Monta o EventoRequest: data ISO e horário HH:mm exatamente como digitados (sem fuso no meio),
 * textos sem espaços sobrando e vazios como null. A descrição mantém as quebras de linha.
 */
export function montarPayloadEvento(valores) {
  return {
    titulo: normalizarEspacos(valores.titulo),
    descricao: vazioParaNull(valores.descricao.trim()),
    data: dataBrParaIso(valores.data),
    horario: valores.horario.trim(),
    local: vazioParaNull(normalizarEspacos(valores.local)),
  };
}

/**
 * Erros do servidor → campos do formulário. Provisório: depende do texto exato das
 * mensagens do EventoRequest (ver schemas/errosServidor.js). O 409 da RN09 (evento
 * encerrado) não é de campo: vai para o topo do formulário.
 */
export const mapearErroDoServidor = criarMapeadorDeErros({
  campoPorMensagem: {
    'O título é obrigatório': 'titulo',
    'O título deve ter no máximo 150 caracteres': 'titulo',
    'A descrição deve ter no máximo 1000 caracteres': 'descricao',
    'A data é obrigatória': 'data',
    'O horário é obrigatório': 'horario',
    'O local deve ter no máximo 255 caracteres': 'local',
  },
});
