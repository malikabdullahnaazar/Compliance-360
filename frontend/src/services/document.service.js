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

  // New flow: start chart intake (PDF only) -> returns { job_id }
  startChartIntake: (formData) => {
    return api.post('/ai/documents/chart_intake/start/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // New flow: poll chart intake status
  getChartIntakeStatus: (jobId) => {
    return api.get(`/ai/documents/chart_intake/${jobId}/status/`);
  },

  // New flow: cancel chart intake
  cancelChartIntake: (jobId) => {
    return api.post(`/ai/documents/chart_intake/${jobId}/cancel/`);
  },

  // New flow: confirm create patient + attach document
  createPatientAndAttachFromIntake: (jobId, payload) => {
    return api.post(`/ai/documents/chart_intake/${jobId}/create_patient_and_attach/`, payload);
  },

  // New flow: attach to existing patient (duplicate edge case)
  attachExistingPatientFromIntake: (jobId, patientId) => {
    return api.post(`/ai/documents/chart_intake/${jobId}/attach_existing/`, { patient_id: patientId });
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

  // Download document (Document library / direct document API — agency QA+admin)
  downloadDocument: (id) => {
    return api.get(`/ai/documents/${id}/download/`, {
      responseType: 'blob',
    });
  },

  /**
   * Download an AI source document in the context of an assigned audit report.
   * Use this for clinicians and anyone viewing analyzed sources via assignment (not /ai/documents/...).
   */
  downloadAnalyzedSourceFromAssignment: (assignmentId, docId) => {
    return api.get(
      `/ai/mistral/assigned/${assignmentId}/analyzed_documents/${docId}/download/`,
      { responseType: 'blob' },
    );
  },
};