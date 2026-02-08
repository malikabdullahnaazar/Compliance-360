import api from './api';

// Agency API calls
export const getAgencies = () => api.get('admin/agencies/').then((r) => r.data);

export const createAgency = (data) =>
  api.post('admin/agencies/', data).then((r) => r.data);

export const updateAgency = (id, data) =>
  api.patch(`admin/agencies/${id}/`, data).then((r) => r.data);

export const deleteAgency = (id) =>
  api.delete(`admin/agencies/${id}/`).then((r) => r.data);

// User API calls
export const getUsers = () => api.get('admin/users/').then((r) => r.data);

export const createUser = (data) =>
  api.post('admin/users/create/', data).then((r) => r.data);

export const updateUser = (id, data) =>
  api.patch(`admin/users/${id}/`, data).then((r) => r.data);

export const deleteUser = (id) =>
  api.delete(`admin/users/${id}/`).then((r) => r.data);

export const toggleUserStatus = (id, isActive) =>
  api.patch(`admin/users/${id}/toggle-status/`, { is_active: isActive }).then((r) => r.data);

