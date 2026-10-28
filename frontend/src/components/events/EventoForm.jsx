import { LIMITES_EVENTO } from '../../constants/eventos';
import { TAMANHO_DATA_MASCARADA, TAMANHO_HORARIO_MASCARADO } from '../../schemas/eventoSchema';
import { Alert } from '../ui/Alert';
import { TextAreaField, TextField } from '../ui/FormField';
import styles from './EventoForm.module.css';

/**
 * Formulário "burro" de evento: recebe valores e erros e avisa mudanças.
 * O estado vive em useEventoForm; o envio, em EventoEditor. Data e horário são digitados
 * com máscara (DD/MM/AAAA e HH:MM, 24 h) e vão ao backend exatamente como digitados.
 */
export function EventoForm({ idFormulario, valores, erros, erroGeral, onAlterar, onSairDoCampo, onEnviar, children }) {
  function campo(nome) {
    return {
      id: `${idFormulario}-${nome}`,
      name: nome,
      value: valores[nome],
      erro: erros[nome],
      onChange: (evento) => onAlterar(nome, evento.target.value),
      onBlur: () => onSairDoCampo(nome),
    };
  }

  return (
    <form id={idFormulario} className={styles.formulario} onSubmit={onEnviar} noValidate>
      {erroGeral && <Alert>{erroGeral}</Alert>}
      <p className={styles.nota}>Campos marcados com * são obrigatórios.</p>

      <fieldset className={styles.secao}>
        <legend className={styles.legenda}>Evento</legend>
        <TextField
          {...campo('titulo')}
          className={styles.inteiro}
          rotulo="Título"
          obrigatorio
          autoComplete="off"
          maxLength={LIMITES_EVENTO.titulo}
          data-autofocus
        />
        <TextField
          {...campo('data')}
          className={styles.terco}
          rotulo="Data"
          obrigatorio
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/AAAA"
          maxLength={TAMANHO_DATA_MASCARADA}
        />
        <TextField
          {...campo('horario')}
          className={styles.terco}
          rotulo="Horário"
          obrigatorio
          inputMode="numeric"
          autoComplete="off"
          placeholder="HH:MM"
          dica="Formato 24 horas, ex.: 19:30."
          maxLength={TAMANHO_HORARIO_MASCARADO}
        />
        <TextField
          {...campo('local')}
          className={styles.inteiro}
          rotulo="Local"
          autoComplete="off"
          maxLength={LIMITES_EVENTO.local}
        />
        <TextAreaField
          {...campo('descricao')}
          className={styles.inteiro}
          rotulo="Descrição"
          rows={4}
          maxLength={LIMITES_EVENTO.descricao}
          dica={`Até ${LIMITES_EVENTO.descricao} caracteres.`}
        />
      </fieldset>

      {children}
    </form>
  );
}
