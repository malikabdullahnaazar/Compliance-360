import api from './api';

export const promptService = {
  // Get all prompts
  getPrompts: (params) => api.get('/ai/prompts/', { params }),

  // Get a single prompt
  getPrompt: (id) => api.get(`/ai/prompts/${id}/`),

  // Create a new prompt
  createPrompt: (data) => api.post('/ai/prompts/', data),

  // Update an existing prompt
  updatePrompt: (id, data) => api.patch(`/ai/prompts/${id}/`, data),

  // Delete a prompt
  deletePrompt: (id) => api.delete(`/ai/prompts/${id}/`),

  // Activate a prompt (only one active at a time)
  activatePrompt: (id) => api.post(`/ai/prompts/${id}/activate/`),
};
