import api from './api';

// Agency API calls
export const getAgencies = (params = {}) => api.get('agencies/agencies/', { params }).then((r) => r.data.results ? { results: r.data.results, count: r.data.count } : { results: Array.isArray(r.data) ? r.data : [], count: Array.isArray(r.data) ? r.data.length : 0 });

export const createAgency = (data) =>
  api.post('agencies/agencies/', data).then((r) => r.data);

export const updateAgency = (id, data) =>
  api.patch(`agencies/agencies/${id}/`, data).then((r) => r.data);

export const deleteAgency = (id) =>
  api.delete(`agencies/agencies/${id}/`).then((r) => r.data);

// User API calls
export const getUsers = (params = {}) => api.get('admin/users/', { params }).then((r) => r.data.results ? { results: r.data.results, count: r.data.count } : { results: Array.isArray(r.data) ? r.data : [], count: Array.isArray(r.data) ? r.data.length : 0 });

export const createUser = (data) =>
  api.post('admin/users/create/', data).then((r) => r.data);

export const updateUser = (id, data) =>
  api.patch(`admin/users/${id}/`, data).then((r) => r.data);

export const deleteUser = (id) =>
  api.delete(`admin/users/${id}/`).then((r) => r.data);

export const toggleUserStatus = (id, isActive) =>
  api.patch(`admin/users/${id}/toggle-status/`, { is_active: isActive }).then((r) => r.data);

