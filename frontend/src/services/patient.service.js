import api from './api';

export const patientService = {
  // Get all patients
  getPatients: (params = {}) => {
    return api.get('/patients/patients/', { params });
  },

  // Get patient by ID
  getPatientById: (id) => {
    return api.get(`/patients/patients/${id}/`);
  },

  // Create a new patient
  createPatient: (data) => {
    return api.post('/patients/patients/', data);
  },

  // Update patient
  updatePatient: (id, data) => {
    return api.put(`/patients/patients/${id}/`, data);
  },

  // Delete patient
  deletePatient: (id) => {
    return api.delete(`/patients/patients/${id}/`);
  },

  // Search patients
  searchPatients: (query) => {
    return api.get(`/patients/patients/search/?q=${encodeURIComponent(query)}`);
  },

  // Get patients created by current user
  getMyPatients: () => {
    return api.get('/patients/patients/my_patients/');
  },
};