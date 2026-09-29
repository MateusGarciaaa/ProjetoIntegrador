import { useState } from 'react';
import { Button } from '../ui/Button';
import { SelectField } from '../ui/SelectField';
import { TextField } from '../ui/TextField';
import { useForm } from '../../hooks/useForm';
import { MEMBER_STATUS_OPTIONS } from '../../constants/memberStatus';
import { formatCpf, formatPhone, todayIsoDate } from '../../utils/formatters';
import { toMemberFormValues, toMemberPayload, validateMemberForm } from './memberFormSchema';
import styles from './MemberForm.module.css';

const INPUT_MASKS = { cpf: formatCpf, phone: formatPhone };

export function MemberForm({ member, submitLabel, onSubmit, onCancel }) {
  const { values, errors, setFieldValue, setErrors, validateForm } = useForm({
    initialValues: toMemberFormValues(member),
    validate: validateMemberForm,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const today = todayIsoDate();

  function handleChange(event) {
    const { name, value } = event.target;
    const applyMask = INPUT_MASKS[name];
    setFieldValue(name, applyMask ? applyMask(value) : value);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(toMemberPayload(values));
    } catch (error) {
      if (error.hasFieldErrors) setErrors(error.fieldErrors);
      else setFormError(error.message);
      setIsSubmitting(false);
    }
  }

  const fieldProps = (name) => ({ name, value: values[name], error: errors[name], onChange: handleChange });

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Identificação</legend>
        <TextField label="Nome completo" autoComplete="name" className={styles.wide} autoFocus {...fieldProps('name')} />
        <TextField label="CPF" inputMode="numeric" placeholder="000.000.000-00" optional {...fieldProps('cpf')} />
        <SelectField label="Status" options={MEMBER_STATUS_OPTIONS} {...fieldProps('status')} />
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Contato</legend>
        <TextField label="E-mail" type="email" autoComplete="email" className={styles.double} {...fieldProps('email')} />
        <TextField label="Telefone" type="tel" inputMode="numeric" placeholder="(00) 00000-0000" optional {...fieldProps('phone')} />
        <TextField label="Endereço" autoComplete="street-address" optional className={styles.wide} {...fieldProps('address')} />
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Datas</legend>
        <TextField label="Nascimento" type="date" max={today} optional {...fieldProps('birthDate')} />
        <TextField label="Conversão" type="date" max={today} optional {...fieldProps('conversionDate')} />
        <TextField label="Batismo" type="date" max={today} optional {...fieldProps('baptismDate')} />
      </fieldset>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
