import { httpClient } from '../http/httpClient';

const RESOURCE = '/members';
const DEFAULT_SORT = 'name,asc';

export const memberApi = {
  async list({ page, size, search }) {
    const params = { page, size, sort: DEFAULT_SORT, search: search || undefined };
    const { data } = await httpClient.get(RESOURCE, { params });
    return data;
  },

  async create(member) {
    const { data } = await httpClient.post(RESOURCE, member);
    return data;
  },

  async update(id, member) {
    const { data } = await httpClient.put(`${RESOURCE}/${id}`, member);
    return data;
  },

  async remove(id) {
    await httpClient.delete(`${RESOURCE}/${id}`);
  },
};
