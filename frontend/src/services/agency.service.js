import api from './api';

export const agencyService = {
  // Get all agencies
  getAgencies: (params = {}) => {
    return api.get('/agencies/agencies/', params);
  },

  // Get agency by ID
  getAgencyById: (id) => {
    return api.get(`/agencies/agencies/${id}/`);
  },

  // Create a new agency
  createAgency: (data) => {
    return api.post('/agencies/agencies/', data);
  },

  // Update agency
  updateAgency: (id, data) => {
    return api.put(`/agencies/agencies/${id}/`, data);
  },

  // Delete agency
  deleteAgency: (id) => {
    return api.delete(`/agencies/agencies/${id}/`);
  },

  // Get current user's agency
  getMyAgency: () => {
    return api.get('/agencies/agencies/my_agency/');
  },

  // Add admin to agency
  addAdminToAgency: (agencyId, userId, permissions = {}) => {
    return api.post(`/agencies/agencies/${agencyId}/add_admin/`, {
      user_id: userId,
      ...permissions
    });
  },

  // Remove admin from agency
  removeAdminFromAgency: (agencyId, userId) => {
    return api.post(`/agencies/agencies/${agencyId}/remove_admin/`, {
      user_id: userId
    });
  },

  // Get agency analytics
  getAnalytics: () => {
    return api.get('/agencies/analytics/overview/');
  },
};