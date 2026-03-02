import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  User as UserIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import { patientService } from '../services/patient.service';
import { addToast } from '../store/slices/uiSlice';
import { useDispatch } from 'react-redux';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Modal from '../components/common/Modal';

const PatientsPage = () => {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [ordering, setOrdering] = useState('-created_at');
  const [statusFilter, setStatusFilter] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const dispatch = useDispatch();

  const fetchPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = {
        page: currentPage,
        page_size: pageSize,
        ordering: ordering,
        search: searchTerm,
        status: statusFilter
      };

      const response = await patientService.getPatients(params);

      // DRF returns { count, next, previous, results }
      if (response.data?.results) {
        setPatients(response.data.results);
        setTotalCount(response.data.count);
      } else {
        // Fallback for non-paginated or error
        setPatients(Array.isArray(response.data) ? response.data : []);
        setTotalCount(Array.isArray(response.data) ? response.data.length : 0);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      dispatch(addToast({ type: 'error', message: 'Failed to fetch patients' }));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, ordering, searchTerm, statusFilter, dispatch]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleSort = (field) => {
    if (ordering === field) {
      setOrdering(`-${field}`);
    } else {
      setOrdering(field);
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const handleDelete = async () => {
    if (!selectedPatient) return;
    try {
      setDeleting(true);
      await patientService.deletePatient(selectedPatient.id);
      dispatch(addToast({ type: 'success', message: 'Patient deleted successfully' }));
      fetchPatients();
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting patient:', error);
      dispatch(addToast({ type: 'error', message: 'Failed to delete patient' }));
    } finally {
      setDeleting(false);
    }
  };

  const getSortIcon = (field) => {
    if (ordering === field) return <ArrowUp className="h-4 w-4 ml-1" />;
    if (ordering === `-${field}`) return <ArrowDown className="h-4 w-4 ml-1" />;
    return <ArrowUpDown className="h-4 w-4 ml-1 opacity-30" />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'Inactive':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

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
                    Patients List
                  </h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Manage patient records, track status and compliance.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link to="/patients/new" className="w-full sm:w-auto">
                    <Button type="button" variant="primary" className="w-full justify-center shadow-sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New Patient
                    </Button>
                  </Link>
                  {/* <Button type="button" variant="outline" className="hidden sm:flex shadow-sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button> */}
                </div>
              </div>

              {/* Section 2: Filters & Search Bar Card */}
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
                        placeholder="Search by name, email..."
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
                          value={statusFilter}
                          onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                        >
                          <option value="">All Statuses</option>
                          <option value="Active">Active</option>
                          <option value="Pending">Pending</option>
                          <option value="Inactive">Inactive</option>
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

              {/* Section 3: Patients Table Card */}
              <Card className="overflow-hidden border-gray-200 dark:border-gray-800 shadow-sm transition-none hover:shadow-sm">
                <CardContent className="p-0">
                  {isLoading && patients.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-64 text-gray-500 gap-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                      <p>Loading patient records...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                          <tr>
                            <th
                              className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer group"
                              onClick={() => handleSort('first_name')}
                            >
                              <div className="flex items-center">
                                Patient Name
                                {getSortIcon('first_name')}
                              </div>
                            </th>
                            <th
                              className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell cursor-pointer"
                              onClick={() => handleSort('email')}
                            >
                              <div className="flex items-center">
                                Contact
                                {getSortIcon('email')}
                              </div>
                            </th>
                            <th
                              className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer"
                              onClick={() => handleSort('status')}
                            >
                              <div className="flex items-center">
                                Status
                                {getSortIcon('status')}
                              </div>
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                              Compliance
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-transparent dark:divide-gray-800">
                          {patients.length > 0 ? (
                            patients.map((patient) => (
                              <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="h-9 w-9 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center border border-teal-100 dark:border-teal-800">
                                      <UserIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                    </div>
                                    <div className="ml-3">
                                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                                        {patient.first_name} {patient.last_name}
                                      </div>
                                      <div className="text-xs text-gray-500 block sm:hidden">{patient.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                  <div className="text-sm text-gray-900 dark:text-white">{patient.email}</div>
                                  <div className="text-xs text-gray-500">{patient.phone}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold leading-none ${getStatusColor(patient.status)}`}>
                                    {patient.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                      <div className="bg-teal-500 h-full w-[85%] rounded-full"></div>
                                    </div>
                                    <span className="text-sm font-medium text-teal-600">85%</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex justify-end gap-2">
                                    <Link to={`/patients/${patient.id}`} title="View Details">
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <Eye className="h-4 w-4 text-gray-500 hover:text-teal-600" />
                                      </Button>
                                    </Link>
                                    <Link to={`/patients/${patient.id}`} title="Edit">
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <Edit className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                                      </Button>
                                    </Link>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      title="Delete"
                                      onClick={() => {
                                        setSelectedPatient(patient);
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
                                {isLoading ? 'Updating records...' : 'No patients found matching your criteria.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>

                {/* Pagination Controls */}
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
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                          let pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${currentPage === pageNum
                                ? 'bg-teal-600 text-white'
                                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
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
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !deleting && setIsDeleteModalOpen(false)}
        title="Delete Patient"
        footer={
          <div className="flex gap-3 w-full">
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
          </div>
        }
      >
        <div className="py-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-gray-300">
            Are you sure you want to delete <span className="font-semibold">{selectedPatient?.first_name} {selectedPatient?.last_name}</span>?
            This action cannot be undone and will remove all associated records.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default PatientsPage;