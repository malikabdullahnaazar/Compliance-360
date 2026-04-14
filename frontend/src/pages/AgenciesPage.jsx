import { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Building2,
    Plus,
    Edit2,
    Trash2,
    ArrowLeft,
    Search,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Filter
} from 'lucide-react';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';
import Card, { CardContent } from '../components/ui/Card';
import Modal from '../components/common/Modal';
import { getAgencies, createAgency, updateAgency, deleteAgency } from '../services/admin.service';
import { useDispatch } from 'react-redux';
import { addToast } from '../store/slices/uiSlice';

const AgenciesPage = () => {
    const { user } = useContext(AuthContext);
    const dispatch = useDispatch();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Data & Pagination State
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [ordering, setOrdering] = useState('-created_at');
    const [statusFilter, setStatusFilter] = useState('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedAgency, setSelectedAgency] = useState(null);

    // Form states
    const [formData, setFormData] = useState({ name: '' });
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const loadAgencies = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                page_size: pageSize,
                ordering: ordering,
                search: searchTerm,
                is_active: statusFilter
            };
            const data = await getAgencies(params);

            if (data.results) {
                setAgencies(data.results);
                setTotalCount(data.count);
            } else {
                setAgencies(Array.isArray(data) ? data : []);
                setTotalCount(Array.isArray(data) ? data.length : 0);
            }
        } catch (error) {
            dispatch(addToast({
                type: 'error',
                message: error.response?.data?.detail || 'Failed to load agencies'
            }));
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, ordering, searchTerm, statusFilter, dispatch]);

    useEffect(() => {
        loadAgencies();
    }, [loadAgencies]);

    const handleSort = (field) => {
        if (ordering === field) {
            setOrdering(`-${field}`);
        } else {
            setOrdering(field);
        }
        setCurrentPage(1);
    };

    const getSortIcon = (field) => {
        if (ordering === field) return <ArrowUp className="h-4 w-4 ml-1" />;
        if (ordering === `-${field}`) return <ArrowDown className="h-4 w-4 ml-1" />;
        return <ArrowUpDown className="h-4 w-4 ml-1 opacity-30" />;
    };

    const handleCreateClick = () => {
        setFormData({ name: '' });
        setFormErrors({});
        setIsCreateModalOpen(true);
    };

    const handleEditClick = (agency) => {
        setSelectedAgency(agency);
        setFormData({ name: agency.name });
        setFormErrors({});
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (agency) => {
        setSelectedAgency(agency);
        setIsDeleteModalOpen(true);
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) {
            errors.name = 'Agency name is required';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            await createAgency({ name: formData.name.trim() });
            dispatch(addToast({ type: 'success', message: 'Agency created successfully' }));
            setIsCreateModalOpen(false);
            loadAgencies();
        } catch (error) {
            const errorMsg = error.response?.data?.name?.[0] ||
                error.response?.data?.detail ||
                'Failed to create agency';
            dispatch(addToast({ type: 'error', message: errorMsg }));
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            await updateAgency(selectedAgency.id, { name: formData.name.trim() });
            dispatch(addToast({ type: 'success', message: 'Agency updated successfully' }));
            setIsEditModalOpen(false);
            loadAgencies();
        } catch (error) {
            const errorMsg = error.response?.data?.name?.[0] ||
                error.response?.data?.detail ||
                'Failed to update agency';
            dispatch(addToast({ type: 'error', message: errorMsg }));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        setSubmitting(true);
        try {
            await deleteAgency(selectedAgency.id);
            dispatch(addToast({ type: 'success', message: 'Agency deleted successfully' }));
            setIsDeleteModalOpen(false);
            loadAgencies();
        } catch (error) {
            const errorMsg = error.response?.data?.detail || 'Failed to delete agency';
            dispatch(addToast({ type: 'error', message: errorMsg }));
        } finally {
            setSubmitting(false);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    if (!user || user.role !== 'superadmin') {
        return null;
    }

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
                    {/* Main Container Card */}
                    <Card className="bg-white dark:bg-gray-900 border-none shadow-xl ring-1 ring-gray-200 dark:ring-gray-800 p-6 sm:p-8">
                        <CardContent className="p-0 space-y-8">
                            {/* Header Section */}
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Link
                                            to="/dashboard"
                                            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[var(--primary-color)] dark:text-gray-400 dark:hover:text-teal-400 cursor-pointer"
                                        >
                                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                                            Back to Dashboard
                                        </Link>
                                    </div>
                                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl flex items-center gap-3">
                                        <Building2 className="h-8 w-8 text-teal-500" />
                                        Agencies
                                    </h1>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        Manage all agencies in the system
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="primary"
                                        size="md"
                                        onClick={handleCreateClick}
                                        className="w-full sm:w-auto justify-center shadow-sm"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Agency
                                    </Button>
                                </div>
                            </div>

                            {/* Filters & Search Bar Card */}
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
                                                placeholder="Search agencies..."
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
                                                    <option value="true">Active</option>
                                                    <option value="false">Inactive</option>
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

                            {/* Content */}
                            <Card className="overflow-hidden border-gray-200 dark:border-gray-800 shadow-sm transition-none hover:shadow-sm">
                                <CardContent className="p-0">
                                    {loading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mr-2"></div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Loading agencies...</p>
                                        </div>
                                    ) : agencies.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 px-4">
                                            <Building2 className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {searchTerm ? 'No agencies found matching your search' : 'No agencies yet. Create one to get started.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-gray-50 dark:bg-gray-800/50">
                                                    <tr>
                                                        <th
                                                            className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer group"
                                                            onClick={() => handleSort('name')}
                                                        >
                                                            <div className="flex items-center">
                                                                Agency Name
                                                                {getSortIcon('name')}
                                                            </div>
                                                        </th>
                                                        <th
                                                            className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell"
                                                        >
                                                            Slug
                                                        </th>
                                                        <th
                                                            className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                                                            onClick={() => handleSort('created_at')}
                                                        >
                                                            <div className="flex items-center">
                                                                Created on
                                                                {getSortIcon('created_at')}
                                                            </div>
                                                        </th>
                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {agencies.map((agency) => (
                                                        <tr key={agency.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {agency.name}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                    {agency.slug}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                    {agency.created_at ? new Date(agency.created_at).toLocaleDateString() : '—'}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={() => handleEditClick(agency)}
                                                                        className="p-2 text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                                                                        title="Edit agency"
                                                                    >
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteClick(agency)}
                                                                        className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                        title="Delete agency"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
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
                                                disabled={currentPage === 1 || loading}
                                                onClick={() => setCurrentPage(prev => prev - 1)}
                                                className="h-8 w-8 p-0"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>

                                            <div className="flex items-center gap-1">
                                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                                    let pageNum = i + 1;
                                                    // Simple logic to show first 5 pages, could be improved for large page counts
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
                                                disabled={currentPage === totalPages || loading}
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
            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create Agency"
                size="md"
                footer={
                    <>
                        <Button
                            variant="outline"
                            className="flex-1 justify-center"
                            onClick={() => setIsCreateModalOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            className="flex-1 justify-center"
                            onClick={handleCreateSubmit}
                            disabled={submitting}
                        >
                            {submitting ? 'Creating...' : 'Create Agency'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleCreateSubmit}>
                    <div>
                        <label htmlFor="agency-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Agency Name
                        </label>
                        <input
                            type="text"
                            id="agency-name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg border ${formErrors.name
                                ? 'border-red-300 dark:border-red-600'
                                : 'border-gray-200 dark:border-gray-700'
                                } bg-white dark:bg-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500`}
                            placeholder="Enter agency name"
                            autoFocus
                        />
                        {formErrors.name && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.name}</p>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Agency"
                size="md"
                footer={
                    <>
                        <Button
                            variant="outline"
                            className="flex-1 justify-center"
                            onClick={() => setIsEditModalOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            className="flex-1 justify-center"
                            onClick={handleEditSubmit}
                            disabled={submitting}
                        >
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleEditSubmit}>
                    <div>
                        <label htmlFor="edit-agency-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Agency Name
                        </label>
                        <input
                            type="text"
                            id="edit-agency-name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg border ${formErrors.name
                                ? 'border-red-300 dark:border-red-600'
                                : 'border-gray-200 dark:border-gray-700'
                                } bg-white dark:bg-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500`}
                            placeholder="Enter agency name"
                            autoFocus
                        />
                        {formErrors.name && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.name}</p>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Agency"
                size="md"
                footer={
                    <>
                        <Button
                            variant="outline"
                            className="flex-1 justify-center"
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            className="flex-1 justify-center bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                            onClick={handleDeleteConfirm}
                            disabled={submitting}
                        >
                            {submitting ? 'Deleting...' : 'Delete Agency'}
                        </Button>
                    </>
                }
            >
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                        <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Are you sure you want to delete <span className="font-semibold">{selectedAgency?.name}</span>?
                        This action cannot be undone.
                    </p>
                </div>
            </Modal>
        </div>
    );
};

export default AgenciesPage;
