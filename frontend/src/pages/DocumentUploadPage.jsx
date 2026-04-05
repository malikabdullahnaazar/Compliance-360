import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Paperclip,
  ArrowLeft
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import { documentService } from '../services/document.service';
import { patientService } from '../services/patient.service';
import { addToast } from '../store/slices/uiSlice';
import { useDispatch } from 'react-redux';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';

const DocumentUploadPage = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState({
    patientId: '',
    documentType: '',
    description: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const [patients, setPatients] = useState([]);
  const dispatch = useDispatch();

  // Fetch patients from API
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await patientService.getPatients();
        const data = response.data.results || response.data || [];
        setPatients(data);
      } catch (error) {
        console.error('Error fetching patients:', error);
        dispatch(addToast({ type: 'error', message: 'Failed to fetch patients' }));
      }
    };

    fetchPatients();
  }, [dispatch]);

  // Document types
  const documentTypes = [
    { value: 'election_statement', label: 'Election Statement' },
    { value: 'cti_initial', label: 'CTI - Initial' },
    { value: 'cti_recertification', label: 'CTI - Recertification' },
    { value: 'rn_assessment', label: 'RN Initial Assessment' },
    { value: 'comprehensive_assessment', label: 'Comprehensive Assessment' },
    { value: 'plan_of_care', label: 'Plan of Care' },
    { value: 'f2f_encounter', label: 'Face-to-Face Encounter' },
    { value: 'clinical_notes', label: 'Clinical Notes' },
    { value: 'physician_orders', label: 'Physician Orders' },
    { value: 'other', label: 'Other' },
  ];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    const validFiles = [];
    const newErrors = {};

    // OpenAI production limit – files larger than this trigger an AI-analysis warning.
    const OPENAI_LIMIT_MB = 20;
    // Django server hard limit – reject outright
    const SERVER_LIMIT_MB = 100;

    files.forEach(file => {
      const fileSizeMB = file.size / (1024 * 1024);

      if (fileSizeMB > SERVER_LIMIT_MB) {
        newErrors[file.name] = `File (${fileSizeMB.toFixed(1)} MB) exceeds the ${SERVER_LIMIT_MB} MB server limit. Please split the document.`;
        return;
      }

      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        newErrors[file.name] = 'Only PDF and Word documents are allowed';
        return;
      }

      validFiles.push({
        file,
        name: file.name,
        size: file.size,
        sizeMB: fileSizeMB,
        type: file.type,
        preview: URL.createObjectURL(file),
        exceedsAILimit: fileSizeMB > OPENAI_LIMIT_MB,
      });
    });

    setErrors(newErrors);
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (fileName) => {
    setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fileName];
      return newErrors;
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.patientId) {
      newErrors.patientId = 'Patient selection is required';
    }

    if (!formData.documentType) {
      newErrors.documentType = 'Document type is required';
    }

    if (selectedFiles.length === 0) {
      newErrors.files = 'At least one file must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload each file
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        const uploadFormData = new FormData();
        uploadFormData.append('file', file.file);
        uploadFormData.append('document_type', formData.documentType);
        uploadFormData.append('patient_id', formData.patientId);

        await documentService.uploadPatientDocument(uploadFormData);

        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 100
        }));
      }

      dispatch(addToast({ type: 'success', message: 'Documents uploaded successfully!' }));
      navigate('/documents');
    } catch (error) {
      console.error('Error uploading documents:', error);
      dispatch(addToast({ type: 'error', message: 'Failed to upload documents' }));
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/documents');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] dark:bg-gray-900 dark:text-gray-100">
      <Sidebar
        onToggle={setSidebarCollapsed}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-0 lg:ml-64'}`}>
        <Navbar
          variant="app"
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        <div className="mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div className="mb-8">
            <button
              onClick={handleCancel}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Documents
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Upload Documents
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
              Upload patient documents for compliance review
            </p>
          </div>

          <Card>
            <CardHeader className="py-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Document Information
              </h2>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Select Patient <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="patientId"
                        name="patientId"
                        value={formData.patientId}
                        onChange={handleChange}
                        className={`block w-full pl-3 pr-10 py-2 border ${errors.patientId ? 'border-red-300' : 'border-gray-300'
                          } rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500`}
                      >
                        <option value="">Select a patient</option>
                        {patients.map(patient => (
                          <option key={patient.id} value={patient.id}>
                            {patient.first_name} {patient.last_name}
                          </option>
                        ))}
                      </select>
                      {errors.patientId && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.patientId}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Document Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="documentType"
                        name="documentType"
                        value={formData.documentType}
                        onChange={handleChange}
                        className={`block w-full pl-3 pr-10 py-2 border ${errors.documentType ? 'border-red-300' : 'border-gray-300'
                          } rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500`}
                      >
                        <option value="">Select document type</option>
                        {documentTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      {errors.documentType && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.documentType}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={4}
                        className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                        placeholder="Add any additional information about these documents..."
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Upload Files <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 rounded-md dark:border-gray-700">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600 dark:text-gray-400">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-teal-600 hover:text-teal-500"
                        >
                          <span>Upload files</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept=".pdf,.doc,.docx"
                            multiple
                            onChange={handleFileChange}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PDF, DOC, DOCX – up to 100 MB per file.
                        <span className="text-yellow-600 font-medium"> Files larger than 20 MB may require Dev mode for AI analysis.</span>
                      </p>
                    </div>
                  </div>
                  {errors.files && (
                    <p className="mt-1 text-sm text-red-600">{errors.files}</p>
                  )}
                </div>

                {selectedFiles.length > 0 && (
                  <ul className="border border-gray-200 rounded-md divide-y divide-gray-200 dark:border-gray-800 dark:divide-gray-800">
                    {selectedFiles.map((fileInfo, index) => (
                      <li key={index} className={`flex items-center justify-between p-3 ${fileInfo.exceedsAILimit ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-5 w-5 text-gray-400" />
                          <span className="text-sm font-medium truncate max-w-xs">{fileInfo.name}</span>
                          <span className="text-xs text-gray-400">({fileInfo.sizeMB ? fileInfo.sizeMB.toFixed(1) : (fileInfo.size / 1024 / 1024).toFixed(1)} MB)</span>
                          {fileInfo.exceedsAILimit && (
                            <span className="text-xs text-yellow-600 font-semibold px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                              ⚠ &gt;20 MB – AI limit in Prod
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(fileInfo.name)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex justify-end space-x-3 pt-6 border-t dark:border-gray-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || selectedFiles.length === 0}
                  >
                    {isSubmitting ? 'Uploading...' : 'Upload Documents'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadPage;