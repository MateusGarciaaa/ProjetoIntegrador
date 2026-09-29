import { ApiError } from '../http/apiError';
import { normalizeForSearch, onlyDigits } from '../../utils/formatters';
import { createMemberSeed } from './memberSeed';
import { simulateLatency } from './simulateLatency';

let members = createMemberSeed();

function matchesSearch(member, search) {
  const term = normalizeForSearch(search);
  const digits = onlyDigits(search);
  return (
    normalizeForSearch(member.name).includes(term) ||
    normalizeForSearch(member.email).includes(term) ||
    (digits.length > 0 && (member.cpf ?? '').includes(digits))
  );
}

function toPage(items, page, size) {
  const start = page * size;
  return {
    content: items.slice(start, start + size),
    totalElements: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
    number: page,
    size,
  };
}

function findOrFail(id) {
  const member = members.find((candidate) => candidate.id === id);
  if (!member) throw new ApiError({ status: 404 });
  return member;
}

function ensureUnique(payload, ignoredId) {
  const others = members.filter((member) => member.id !== ignoredId);
  const fieldErrors = {};

  if (others.some((member) => member.email === payload.email)) {
    fieldErrors.email = 'Já existe um membro com este e-mail.';
  }
  if (payload.cpf && others.some((member) => member.cpf === payload.cpf)) {
    fieldErrors.cpf = 'Já existe um membro com este CPF.';
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError({ status: 409, fieldErrors });
  }
}

export const memberMock = {
  async list({ page, size, search }) {
    await simulateLatency();
    const filtered = search ? members.filter((member) => matchesSearch(member, search)) : members;
    const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return structuredClone(toPage(sorted, page, size));
  },

  async create(payload) {
    await simulateLatency();
    ensureUnique(payload);
    const member = { ...payload, id: crypto.randomUUID() };
    members = [...members, member];
    return structuredClone(member);
  },

  async update(id, payload) {
    await simulateLatency();
    findOrFail(id);
    ensureUnique(payload, id);
    const updated = { ...payload, id };
    members = members.map((member) => (member.id === id ? updated : member));
    return structuredClone(updated);
  },

  async remove(id) {
    await simulateLatency();
    findOrFail(id);
    members = members.filter((member) => member.id !== id);
  },
};
