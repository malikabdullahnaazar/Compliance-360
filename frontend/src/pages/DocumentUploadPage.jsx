import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Paperclip,
  ArrowLeft,
  ChevronDown,
  Search,
  Loader2
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import { documentService } from '../services/document.service';
import { patientService } from '../services/patient.service';
import { addToast } from '../store/slices/uiSlice';
import { useDispatch } from 'react-redux';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import NewPatientChartUpload from './document-upload/_components/NewPatientChartUpload';

const DocumentUploadPage = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState('existing');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState({
    patientId: '',
    documentType: 'other',
    description: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  // Patient dropdown state
  const [patients, setPatients] = useState([]);
  const [patientPage, setPatientPage] = useState(1);
  const [hasMorePatients, setHasMorePatients] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const dispatch = useDispatch();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch patients (initial load + pagination + search)
  const fetchPatients = useCallback(async (page = 1, append = false, query = '') => {
    if (append && !loadingMore) setLoadingMore(true);
    else if (!append) setLoadingPatients(true);

    try {
      const params = { page, page_size: 10 };
      if (query) {
        params.search = query;
      }
      const response = await patientService.getPatients(params);
      const data = response.data.results || response.data || [];
      const nextUrl = response.data?.next;
      const hasMore = nextUrl !== null && nextUrl !== undefined;

      if (append) {
        setPatients(prev => [...prev, ...data]);
      } else {
        setPatients(data);
      }
      setHasMorePatients(hasMore);
      setPatientPage(page);
    } catch (error) {
      console.error('Error fetching patients:', error);
      if (!append) {
        dispatch(addToast({ type: 'error', message: 'Failed to fetch patients' }));
      }
    } finally {
      setLoadingPatients(false);
      setLoadingMore(false);
    }
  }, [dispatch, loadingMore]);

  // Initial load
  useEffect(() => {
    fetchPatients(1, false, searchDebounce);
  }, [searchDebounce]);

  // Load more patients
  const loadMorePatients = () => {
    if (hasMorePatients && !loadingMore) {
      fetchPatients(patientPage + 1, true, searchDebounce);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (showPatientDropdown && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showPatientDropdown]);

  // Handle patient selection
  const handlePatientSelect = (patient) => {
    setFormData(prev => ({ ...prev, patientId: patient.id }));
    setShowPatientDropdown(false);
    setSearchQuery('');
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.patientId;
      return newErrors;
    });
  };

  // Document types - "Other" at the top
  const documentTypes = [
    { value: 'other', label: 'Other' },
    { value: 'election_statement', label: 'Election Statement' },
    { value: 'cti_initial', label: 'CTI - Initial' },
    { value: 'cti_recertification', label: 'CTI - Recertification' },
    { value: 'rn_assessment', label: 'RN Initial Assessment' },
    { value: 'comprehensive_assessment', label: 'Comprehensive Assessment' },
    { value: 'plan_of_care', label: 'Plan of Care' },
    { value: 'f2f_encounter', label: 'Face-to-Face Encounter' },
    { value: 'clinical_notes', label: 'Clinical Notes' },
    { value: 'physician_orders', label: 'Physician Orders' },
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
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900/20">
                  <button
                    type="button"
                    onClick={() => setUploadMode('existing')}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      uploadMode === 'existing'
                        ? 'bg-teal-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                    }`}
                  >
                    Upload for Existing Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('new')}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      uploadMode === 'new'
                        ? 'bg-teal-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                    }`}
                  >
                    Upload Chart for New Patient
                  </button>
                </div>
              </div>

              {uploadMode === 'existing' ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Select Patient <span className="text-red-500">*</span>
                        </label>
                        <div className="relative" ref={dropdownRef}>
                          {/* Selected patient display / trigger */}
                          <button
                            type="button"
                            onClick={() => setShowPatientDropdown(!showPatientDropdown)}
                            className={`block w-full pl-3 pr-10 py-2 border ${errors.patientId ? 'border-red-300' : 'border-gray-300'}
                              rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white 
                              focus:outline-none focus:ring-1 focus:ring-teal-500 text-left flex items-center justify-between`}
                          >
                            {formData.patientId ? (
                              <span className="truncate">
                                {patients.find(p => p.id === formData.patientId)?.first_name}{' '}
                                {patients.find(p => p.id === formData.patientId)?.last_name}
                              </span>
                            ) : (
                              <span className="text-gray-400">Search or select a patient</span>
                            )}
                            <ChevronDown className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                          </button>

                          {/* Dropdown panel */}
                          {showPatientDropdown && (
                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-72 overflow-hidden">
                              {/* Search input */}
                              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search patients..."
                                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md 
                                      bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                  />
                                </div>
                              </div>

                              {/* Patient list */}
                              <div className="overflow-y-auto max-h-52">
                                {loadingPatients ? (
                                  <div className="flex items-center justify-center py-6">
                                    <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
                                  </div>
                                ) : patients.length === 0 ? (
                                  <div className="py-6 text-center text-sm text-gray-500">
                                    No patients found
                                  </div>
                                ) : (
                                  <>
                                    {patients.map(patient => (
                                      <button
                                        key={patient.id}
                                        type="button"
                                        onClick={() => handlePatientSelect(patient)}
                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                                          ${formData.patientId === patient.id ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300' : 'text-gray-900 dark:text-white'}`}
                                      >
                                        {patient.first_name} {patient.last_name}
                                        {patient.date_of_birth && (
                                          <span className="ml-2 text-xs text-gray-400">
                                            DOB: {patient.date_of_birth}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                    {hasMorePatients && (
                                      <button
                                        type="button"
                                        onClick={loadMorePatients}
                                        disabled={loadingMore}
                                        className="w-full text-center px-3 py-2 text-sm text-teal-600 dark:text-teal-400 hover:bg-gray-100 dark:hover:bg-gray-700 
                                          transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                                      >
                                        {loadingMore ? (
                                          <>
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Loading...
                                          </>
                                        ) : (
                                          'See More'
                                        )}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
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
                    <div
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 rounded-md dark:border-gray-700 
                        cursor-pointer hover:border-teal-400 transition-colors"
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files) {
                          handleFileChange({ target: { files: e.dataTransfer.files } });
                        }
                      }}
                    >
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-teal-600 hover:text-teal-500">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF, DOC, DOCX – up to 100 MB per file.
                          <span className="text-yellow-600 font-medium"> Files larger than 20 MB may require Dev mode for AI analysis.</span>
                        </p>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".pdf,.doc,.docx"
                          multiple
                          onChange={handleFileChange}
                        />
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
              ) : (
                <NewPatientChartUpload />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadPage;