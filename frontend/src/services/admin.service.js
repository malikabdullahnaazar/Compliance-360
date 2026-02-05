import api from './api';

export const getAgencies = () => api.get('admin/agencies/').then((r) => r.data);

export const createAgency = (name) =>
  api.post('admin/agencies/', { name }).then((r) => r.data);

export const getUsers = () => api.get('admin/users/').then((r) => r.data);
