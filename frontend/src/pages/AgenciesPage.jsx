import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Edit2, Trash2, ArrowLeft, Search } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Modal from '../components/common/Modal';
import { getAgencies, createAgency, updateAgency, deleteAgency } from '../services/admin.service';
import { useDispatch } from 'react-redux';
import { addToast } from '../store/slices/uiSlice';

const AgenciesPage = () => {
    const { user } = useContext(AuthContext);
    const dispatch = useDispatch();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [agencies, setAgencies] = useState([]);
    const [filteredAgencies, setFilteredAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedAgency, setSelectedAgency] = useState(null);

    // Form states
    const [formData, setFormData] = useState({ name: '' });
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadAgencies();
    }, []);

    useEffect(() => {
        // Filter agencies based on search term
        if (searchTerm.trim() === '') {
            setFilteredAgencies(agencies);
        } else {
            const filtered = agencies.filter(agency =>
                agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                agency.slug.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredAgencies(filtered);
        }
    }, [searchTerm, agencies]);

    const loadAgencies = async () => {
        setLoading(true);
        try {
            const data = await getAgencies();
            setAgencies(Array.isArray(data) ? data : []);
            setFilteredAgencies(Array.isArray(data) ? data : []);
        } catch (error) {
            dispatch(addToast({
                type: 'error',
                message: error.response?.data?.detail || 'Failed to load agencies'
            }));
        } finally {
            setLoading(false);
        }
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

    if (!user || user.role !== 'superadmin') {
        return null;
    }

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] dark:bg-black dark:text-gray-100">
            <Sidebar onToggle={setSidebarCollapsed} />
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                <Navbar variant="app" />
                <div className="mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
                    {/* Header */}
                    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <Link
                                to="/dashboard"
                                className="mb-2 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[var(--primary-color)] dark:text-gray-400 dark:hover:text-teal-400 cursor-pointer"
                            >
                                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                                Back to Dashboard
                            </Link>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl flex items-center gap-3">
                                <Building2 className="h-8 w-8 text-teal-500" />
                                Agencies
                            </h1>
                            <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                                Manage all agencies in the system
                            </p>
                        </div>
                        <Button
                            variant="primary"
                            size="md"
                            onClick={handleCreateClick}
                            className="cursor-pointer inline-flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Create Agency
                        </Button>
                    </header>

                    {/* Search Bar */}
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search agencies..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <Card>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading agencies...</p>
                                </div>
                            ) : filteredAgencies.length === 0 ? (
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
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Agency Name
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Slug
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Created on
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                            {filteredAgencies.map((agency) => (
                                                <tr key={agency.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {agency.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
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
