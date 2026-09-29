import { MEMBER_STATUS } from '../../constants/memberStatus';
import { formatCpf, formatPhone, onlyDigits } from '../../utils/formatters';
import { isBlank, isFutureIsoDate, isValidCpf, isValidEmail, isValidPhone } from '../../utils/validators';

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 150;

export const EMPTY_MEMBER_FORM = Object.freeze({
  name: '',
  cpf: '',
  email: '',
  phone: '',
  address: '',
  birthDate: '',
  baptismDate: '',
  conversionDate: '',
  status: MEMBER_STATUS.ATIVO,
});

function lifeEventDateRule(eventLabel) {
  return (value, values) => {
    if (isFutureIsoDate(value)) return `A data de ${eventLabel} não pode estar no futuro.`;
    if (value && values.birthDate && value < values.birthDate) {
      return `A data de ${eventLabel} não pode ser anterior ao nascimento.`;
    }
    return undefined;
  };
}

const RULES = {
  name: (value) => {
    if (isBlank(value)) return 'Informe o nome do membro.';
    const length = value.trim().length;
    if (length < NAME_MIN_LENGTH) return `O nome deve ter pelo menos ${NAME_MIN_LENGTH} letras.`;
    if (length > NAME_MAX_LENGTH) return `O nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`;
    return undefined;
  },
  email: (value) => {
    if (isBlank(value)) return 'Informe o e-mail.';
    return isValidEmail(value) ? undefined : 'Informe um e-mail válido, como nome@exemplo.com.';
  },
  cpf: (value) => (isBlank(value) || isValidCpf(value) ? undefined : 'CPF inválido. Confira os números digitados.'),
  phone: (value) =>
    isBlank(value) || isValidPhone(value) ? undefined : 'Informe o telefone com DDD, como (11) 91234-5678.',
  status: (value) => (isBlank(value) ? 'Selecione o status.' : undefined),
  birthDate: (value) => (isFutureIsoDate(value) ? 'A data de nascimento não pode estar no futuro.' : undefined),
  baptismDate: lifeEventDateRule('batismo'),
  conversionDate: lifeEventDateRule('conversão'),
};

export function validateMemberForm(values) {
  const entries = Object.entries(RULES)
    .map(([field, rule]) => [field, rule(values[field], values)])
    .filter(([, message]) => Boolean(message));
  return Object.fromEntries(entries);
}

export function toMemberFormValues(member) {
  if (!member) return { ...EMPTY_MEMBER_FORM };
  return {
    name: member.name ?? '',
    cpf: formatCpf(member.cpf),
    email: member.email ?? '',
    phone: formatPhone(member.phone),
    address: member.address ?? '',
    birthDate: member.birthDate ?? '',
    baptismDate: member.baptismDate ?? '',
    conversionDate: member.conversionDate ?? '',
    status: member.status ?? MEMBER_STATUS.ATIVO,
  };
}

function emptyToNull(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed || null;
}

export function toMemberPayload(values) {
  return {
    name: values.name.trim(),
    cpf: emptyToNull(onlyDigits(values.cpf)),
    email: values.email.trim().toLowerCase(),
    phone: emptyToNull(onlyDigits(values.phone)),
    address: emptyToNull(values.address),
    birthDate: emptyToNull(values.birthDate),
    baptismDate: emptyToNull(values.baptismDate),
    conversionDate: emptyToNull(values.conversionDate),
    status: values.status,
  };
}
