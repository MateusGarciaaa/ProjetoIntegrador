import { onlyDigits, todayIsoDate } from './formatters';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CPF_LENGTH = 11;
const PHONE_LENGTHS = [10, 11];

export function isBlank(value) {
  return !String(value ?? '').trim();
}

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value ?? '').trim());
}

export function isValidPhone(value) {
  return PHONE_LENGTHS.includes(onlyDigits(value).length);
}

export function isValidCpf(value) {
  const digits = onlyDigits(value);
  const hasAllSameDigits = /^(\d)\1+$/.test(digits);

  if (digits.length !== CPF_LENGTH || hasAllSameDigits) return false;

  return (
    calculateCpfCheckDigit(digits, 9) === Number(digits[9]) &&
    calculateCpfCheckDigit(digits, 10) === Number(digits[10])
  );
}

function calculateCpfCheckDigit(digits, length) {
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += Number(digits[index]) * (length + 1 - index);
  }
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

export function isFutureIsoDate(isoDate) {
  return Boolean(isoDate) && isoDate > todayIsoDate();
}
