/** Tamanhos das colunas em V4__create_eventos.sql, repetidos nos @Size do EventoRequest. */
export const LIMITES_EVENTO = Object.freeze({
  titulo: 150,
  descricao: 1000,
  local: 255,
});

/**
 * Fuso em que o backend decide se um evento já foi encerrado (RN09): o EventoService usa um Clock
 * no fuso da igreja (app.time.zone / APP_TIMEZONE no backend, padrão America/Sao_Paulo).
 * O frontend calcula o "agora" neste fuso, e não no do navegador, para decidir igual ao servidor.
 */
export const FUSO_HORARIO_SERVIDOR = 'America/Sao_Paulo';

export const TAMANHO_PAGINA_EVENTOS = 10;

/**
 * O calendário traz as 6 semanas da grade numa só página: 2000 é o máximo do Spring
 * (TAMANHO_MAXIMO_PAGINA em services/http/pagina.js); acima disso ele reduz sem erro.
 */
export const TAMANHO_PAGINA_CALENDARIO = 2000;

/** Campos que a lista deixa ordenar; a URL só aceita estes, o resto volta ao padrão. */
export const CAMPOS_ORDENAVEIS_EVENTOS = Object.freeze(['data', 'titulo']);

export const ORDENACAO_PADRAO_EVENTOS = Object.freeze({ campo: 'data', direcao: 'asc' });

/**
 * Mesma ordem do @PageableDefault do EventoController (data, horario, id), enviada sempre de forma
 * explícita: eventos do mesmo dia na ordem do horário, e o id deixa a paginação estável.
 */
export const DESEMPATE_EVENTOS = Object.freeze(['data,asc', 'horario,asc', 'id,asc']);

export const VISOES_EVENTOS = Object.freeze({ CALENDARIO: 'calendario', LISTA: 'lista' });

/** A partir desta largura o calendário é a grade mensal; abaixo, vira agenda (mesma quebra da Table). */
export const MEDIA_CALENDARIO_GRADE = '(min-width: 720px)';
