import { LIMITES_MEMBRO } from '../../constants/membros';
import { OPCOES_STATUS } from '../../constants/statusMembro';
import { TAMANHO_DATA_MASCARADA } from '../../schemas/membroSchema';
import { Alert } from '../ui/Alert';
import { SelectField, TextField } from '../ui/FormField';
import styles from './MembroForm.module.css';

/** Tamanho máximo dos campos mascarados, contando pontuação. */
const MAXIMO_CPF_MASCARADO = 14;
const MAXIMO_TELEFONE_MASCARADO = 15;

/**
 * Formulário "burro": recebe valores e erros e avisa mudanças.
 * O estado vive em useMembroForm; o envio, em MembroEditor.
 */
export function MembroForm({ idFormulario, valores, erros, erroGeral, onAlterar, onSairDoCampo, onEnviar, children }) {
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

  /** Datas digitadas como DD/MM/AAAA (a máscara insere as barras). */
  function campoData(nome) {
    return {
      ...campo(nome),
      className: styles.terco,
      inputMode: 'numeric',
      autoComplete: 'off',
      placeholder: 'DD/MM/AAAA',
      maxLength: TAMANHO_DATA_MASCARADA,
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
        <TextField {...campoData('dataNascimento')} rotulo="Nascimento" autoComplete="bday" />
        <TextField {...campoData('dataConversao')} rotulo="Conversão" />
        <TextField {...campoData('dataBatismo')} rotulo="Batismo" />
      </fieldset>

      {children}
    </form>
  );
}
