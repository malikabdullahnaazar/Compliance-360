import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  Trash2,
  Download,
  FileText,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import { documentService } from '../services/document.service';
import { patientService } from '../services/patient.service';
import { addToast } from '../store/slices/uiSlice';
import { useDispatch } from 'react-redux';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Modal from '../components/common/Modal';

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [ordering, setOrdering] = useState('-created_at');
  const [typeFilter, setTypeFilter] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [patients, setPatients] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const dispatch = useDispatch();

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = {
        page: currentPage,
        page_size: pageSize,
        ordering: ordering,
        search: searchTerm,
        document_type: typeFilter,
        patient: patientFilter
      };

      const response = await documentService.getDocuments(params);

      if (response.data?.results) {
        setDocuments(response.data.results);
        setTotalCount(response.data.count);
      } else {
        setDocuments(Array.isArray(response.data) ? response.data : []);
        setTotalCount(Array.isArray(response.data) ? response.data.length : 0);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      dispatch(addToast({ type: 'error', message: 'Failed to fetch documents' }));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, ordering, searchTerm, typeFilter, patientFilter, dispatch]);

  const fetchPatients = useCallback(async () => {
    try {
      const response = await patientService.getPatients({ page_size: 1000 });
      if (response.data?.results) {
        setPatients(response.data.results);
      } else {
        setPatients(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleSort = (field) => {
    if (ordering === field) {
      setOrdering(`-${field}`);
    } else {
      setOrdering(field);
    }
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!selectedDocument) return;
    try {
      setDeleting(true);
      await documentService.deleteDocument(selectedDocument.id);
      dispatch(addToast({ type: 'success', message: 'Document deleted successfully' }));
      fetchDocuments();
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting document:', error);
      dispatch(addToast({ type: 'error', message: 'Failed to delete document' }));
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await documentService.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading document:', error);
      dispatch(addToast({ type: 'error', message: 'Failed to download document' }));
    }
  };

  const handleView = async (doc) => {
    try {
      const response = await documentService.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      dispatch(addToast({ type: 'error', message: 'Failed to view document' }));
    }
  };

  const getSortIcon = (field) => {
    if (ordering === field) return <ArrowUp className="h-4 w-4 ml-1" />;
    if (ordering === `-${field}`) return <ArrowDown className="h-4 w-4 ml-1" />;
    return <ArrowUpDown className="h-4 w-4 ml-1 opacity-30" />;
  };

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

  const totalPages = Math.ceil(totalCount / pageSize);

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
        <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Main Container Card Wrapping All Sections */}
          <Card className="bg-white dark:bg-gray-900 border-none shadow-xl ring-1 ring-gray-200 dark:ring-gray-800 p-6 sm:p-8">
            <CardContent className="p-0 space-y-8">
              {/* Section 1: Header Section */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                    Documents
                  </h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Manage patient documents and compliance reviews.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to="/documents/upload" className="flex-1 sm:flex-none">
                    <Button type="button" variant="primary" className="w-full sm:w-auto flex items-center justify-center shadow-sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </Link>
                  {/* <Button type="button" variant="outline" className="hidden sm:flex items-center shadow-sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button> */}
                </div>
              </div>

              {/* Section 2: Filters Section Card */}
              <Card className="bg-gray-50/50 dark:bg-gray-800/20 border-gray-100 dark:border-gray-800 shadow-sm transition-none hover:shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-teal-500/50 transition-all outline-none text-sm"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <select
                          className="text-sm border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white p-2 outline-none focus:ring-2 focus:ring-teal-500/50"
                          value={typeFilter}
                          onChange={(e) => {
                            setTypeFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                        >
                          <option value="">All Types</option>
                          {documentTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <select
                          className="text-sm border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white p-2 outline-none focus:ring-2 focus:ring-teal-500/50"
                          value={patientFilter}
                          onChange={(e) => {
                            setPatientFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                        >
                          <option value="">All Patients</option>
                          {patients.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.first_name} {p.last_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 ml-auto lg:ml-0 border-l border-gray-200 dark:border-gray-700 pl-3">
                        <span className="text-xs text-gray-500 uppercase font-semibold">Show:</span>
                        <select
                          className="text-sm border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white p-1.5 outline-none focus:ring-2 focus:ring-teal-500/50"
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={15}>15</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 3: Data Table Card */}
              <Card className="overflow-hidden border-gray-200 dark:border-gray-800 shadow-sm transition-none hover:shadow-sm">
                <CardContent className="p-0">
                  {isLoading && documents.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-64 text-gray-500 gap-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                      <p>Loading documents...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                          <tr>
                            <th
                              className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer"
                              onClick={() => handleSort('filename')}
                            >
                              <div className="flex items-center">
                                Document
                                {getSortIcon('filename')}
                              </div>
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Patient
                            </th>
                            <th
                              className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer"
                              onClick={() => handleSort('document_type')}
                            >
                              <div className="flex items-center">
                                Type
                                {getSortIcon('document_type')}
                              </div>
                            </th>
                            <th
                              className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell cursor-pointer"
                              onClick={() => handleSort('created_at')}
                            >
                              <div className="flex items-center">
                                Date
                                {getSortIcon('created_at')}
                              </div>
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-transparent dark:divide-gray-800">
                          {documents.length > 0 ? (
                            documents.map((doc) => (
                              <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-100 dark:border-blue-800">
                                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="ml-3">
                                      <div className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-xs" title={doc.filename}>
                                        {doc.filename}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="flex items-center">
                                    <User className="h-4 w-4 mr-1.5 opacity-50" />
                                    <span className="text-gray-900 dark:text-white font-medium">
                                      {doc.patient_first_name} {doc.patient_last_name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs">
                                  <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded font-semibold uppercase">
                                    {doc.document_type_display || doc.document_type}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1.5 opacity-50" />
                                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      title="View Details"
                                      onClick={() => handleView(doc)}
                                    >
                                      <Eye className="h-4 w-4 text-gray-500 hover:text-teal-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      title="Download"
                                      onClick={() => handleDownload(doc)}
                                    >
                                      <Download className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      title="Delete"
                                      onClick={() => {
                                        setSelectedDocument(doc);
                                        setIsDeleteModalOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                {isLoading ? 'Updating records...' : 'No documents found matching your criteria.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>

                {/* Pagination Section */}
                {totalCount > 0 && (
                  <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Showing <span className="font-medium text-gray-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium text-gray-900 dark:text-white">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span> records
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1 || isLoading}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-1">
                        {[...Array(Math.min(5, totalPages))].map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${currentPage === (i + 1)
                              ? 'bg-teal-600 text-white'
                              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        {totalPages > 5 && <span className="text-gray-400">...</span>}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages || isLoading}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </CardContent>
          </Card>
        </div>
      </div >

      {/* Delete Confirmation Modal */}
      < Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !deleting && setIsDeleteModalOpen(false)}
        title="Delete Document"
        footer={
          < div className="flex gap-3 w-full" >
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1 bg-red-600 hover:bg-red-700 border-red-600 text-white"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div >
        }
      >
        <div className="py-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-gray-300">
            Are you sure you want to delete <span className="font-semibold">{selectedDocument?.filename}</span>?
            This action cannot be undone and will remove the file from our servers permanently.
          </p>
        </div>
      </Modal >
    </div >
  );
};

export default DocumentsPage;