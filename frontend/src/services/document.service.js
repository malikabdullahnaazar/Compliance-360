import api from './api';

export const documentService = {
  // Get all documents
  getDocuments: (params = {}) => {
    return api.get('/ai/documents/', { params });
  },

  // Get document by ID
  getDocumentById: (id) => {
    return api.get(`/ai/documents/${id}/`);
  },

  // Upload document to patient
  uploadPatientDocument: (formData) => {
    return api.post('/ai/documents/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get documents by patient
  getDocumentsByPatient: (patientId) => {
    return api.get(`/ai/documents/by_patient/?patient_id=${patientId}`);
  },

  // Search documents
  searchDocuments: (query) => {
    return api.get(`/ai/documents/search/?q=${encodeURIComponent(query)}`);
  },

  // Get documents created by current user
  getMyDocuments: () => {
    return api.get('/ai/documents/my_documents/');
  },

  // Delete document
  deleteDocument: (id) => {
    return api.delete(`/ai/documents/${id}/`);
  },

  // Download document
  downloadDocument: (id) => {
    return api.get(`/ai/documents/${id}/download/`, {
      responseType: 'blob',
    });
  },
};