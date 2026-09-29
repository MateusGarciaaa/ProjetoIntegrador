const CPF_LENGTH = 11;
const MOBILE_PHONE_LENGTH = 11;
const AREA_CODE_LENGTH = 2;

export function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function formatCpf(value) {
  return onlyDigits(value)
    .slice(0, CPF_LENGTH)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, MOBILE_PHONE_LENGTH);
  const areaCode = digits.slice(0, AREA_CODE_LENGTH);
  const number = digits.slice(AREA_CODE_LENGTH);

  if (!number) return areaCode ? `(${areaCode}` : '';

  const prefixLength = digits.length === MOBILE_PHONE_LENGTH ? 5 : 4;
  if (number.length <= prefixLength) return `(${areaCode}) ${number}`;

  return `(${areaCode}) ${number.slice(0, prefixLength)}-${number.slice(prefixLength)}`;
}

export function formatIsoDate(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function todayIsoDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function normalizeForSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
