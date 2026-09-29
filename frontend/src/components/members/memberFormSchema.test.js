import { describe, expect, it } from 'vitest';
import { EMPTY_MEMBER_FORM, toMemberPayload, validateMemberForm } from './memberFormSchema';

const validForm = { ...EMPTY_MEMBER_FORM, name: 'Maria Souza', email: 'maria@email.com' };

describe('validateMemberForm', () => {
  it('não retorna erros para o mínimo obrigatório', () => {
    expect(validateMemberForm(validForm)).toEqual({});
  });

  it('exige nome e e-mail', () => {
    const errors = validateMemberForm(EMPTY_MEMBER_FORM);
    expect(errors).toHaveProperty('name');
    expect(errors).toHaveProperty('email');
  });

  it('valida CPF apenas quando preenchido', () => {
    expect(validateMemberForm({ ...validForm, cpf: '123.456.789-00' })).toHaveProperty('cpf');
  });

  it('impede batismo anterior ao nascimento', () => {
    const errors = validateMemberForm({ ...validForm, birthDate: '2000-01-01', baptismDate: '1999-12-31' });
    expect(errors).toHaveProperty('baptismDate');
  });
});

describe('toMemberPayload', () => {
  it('remove máscaras, normaliza e-mail e converte vazios em null', () => {
    const payload = toMemberPayload({
      ...validForm,
      email: ' Maria@Email.com ',
      cpf: '526.018.159-06',
      phone: '',
    });
    expect(payload.email).toBe('maria@email.com');
    expect(payload.cpf).toBe('52601815906');
    expect(payload.phone).toBeNull();
    expect(payload.birthDate).toBeNull();
  });
});
