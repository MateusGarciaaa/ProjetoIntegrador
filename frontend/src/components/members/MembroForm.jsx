import { LIMITES_MEMBRO } from '../../constants/membros';
import { OPCOES_STATUS } from '../../constants/statusMembro';
import { Alert } from '../ui/Alert';
import { SelectField, TextField } from '../ui/FormField';
import styles from './MembroForm.module.css';

/** Tamanho máximo dos campos mascarados, contando pontuação. */
const MAXIMO_CPF_MASCARADO = 14;
const MAXIMO_TELEFONE_MASCARADO = 15;

/**
 * Formulário "burro": recebe valores e erros e avisa mudanças.
 * O estado vive em useMembroForm; o envio, em MembroFormModal.
 */
export function MembroForm({ idFormulario, valores, erros, erroGeral, hoje, onAlterar, onSairDoCampo, onEnviar }) {
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
        <legend className={styles.legenda}>Identificação</legend>
        <TextField
          {...campo('nome')}
          className={styles.inteiro}
          rotulo="Nome completo"
          obrigatorio
          autoComplete="name"
          maxLength={LIMITES_MEMBRO.nome}
          data-autofocus
        />
        <TextField
          {...campo('cpf')}
          className={styles.metade}
          rotulo="CPF"
          obrigatorio
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          maxLength={MAXIMO_CPF_MASCARADO}
        />
        <SelectField {...campo('status')} className={styles.metade} rotulo="Status" obrigatorio opcoes={OPCOES_STATUS} />
      </fieldset>

      <fieldset className={styles.secao}>
        <legend className={styles.legenda}>Contato</legend>
        <TextField
          {...campo('email')}
          className={styles.metade}
          rotulo="E-mail"
          obrigatorio
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck="false"
          maxLength={LIMITES_MEMBRO.email}
        />
        <TextField
          {...campo('telefone')}
          className={styles.metade}
          rotulo="Telefone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(45) 99999-0000"
          maxLength={MAXIMO_TELEFONE_MASCARADO}
        />
        <TextField
          {...campo('endereco')}
          className={styles.inteiro}
          rotulo="Endereço"
          autoComplete="street-address"
          maxLength={LIMITES_MEMBRO.endereco}
        />
      </fieldset>

      <fieldset className={styles.secao}>
        <legend className={styles.legenda}>Datas</legend>
        <TextField {...campo('dataNascimento')} className={styles.terco} rotulo="Nascimento" type="date" max={hoje} />
        <TextField
          {...campo('dataConversao')}
          className={styles.terco}
          rotulo="Conversão"
          type="date"
          min={valores.dataNascimento || undefined}
          max={hoje}
        />
        <TextField
          {...campo('dataBatismo')}
          className={styles.terco}
          rotulo="Batismo"
          type="date"
          min={valores.dataNascimento || undefined}
          max={hoje}
        />
      </fieldset>
    </form>
  );
}
