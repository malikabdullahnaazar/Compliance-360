import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Edit2, Trash2, ArrowLeft, Search, Power, PowerOff } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Modal from '../components/common/Modal';
import { getUsers, createUser, updateUser, deleteUser, toggleUserStatus, getAgencies } from '../services/admin.service';
import { useDispatch } from 'react-redux';
import { addToast } from '../store/slices/uiSlice';

const UsersPage = () => {
    const { user } = useContext(AuthContext);
    const dispatch = useDispatch();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [users, setUsers] = useState([]);
    const [agencies, setAgencies] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        agency: '',
        role: 'admin',
    });
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        // Filter users based on search term
        if (searchTerm.trim() === '') {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(u =>
                u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.agency_name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
    }, [searchTerm, users]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersData, agenciesData] = await Promise.all([
                getUsers(),
                getAgencies(),
            ]);
            setUsers(Array.isArray(usersData) ? usersData : []);
            setFilteredUsers(Array.isArray(usersData) ? usersData : []);
            setAgencies(Array.isArray(agenciesData) ? agenciesData : []);
        } catch (error) {
            dispatch(addToast({
                type: 'error',
                message: error.response?.data?.detail || 'Failed to load data'
            }));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClick = () => {
        setFormData({
            email: '',
            username: '',
            agency: '',
            role: 'admin',
            password: '',
        });
        setFormErrors({});
        setIsCreateModalOpen(true);
    };

    const handleEditClick = (u) => {
        setSelectedUser(u);
        setFormData({
            email: u.email || '',
            username: u.username || '',
            agency: u.agency || '',
            role: u.role || 'admin',
            password: '',
        });
        setFormErrors({});
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (u) => {
        setSelectedUser(u);
        setIsDeleteModalOpen(true);
    };

    const handleToggleStatus = async (u) => {
        try {
            await toggleUserStatus(u.id, !u.is_active);
            dispatch(addToast({
                type: 'success',
                message: `User ${u.is_active ? 'deactivated' : 'activated'} successfully`
            }));
            loadData();
        } catch (error) {
            dispatch(addToast({
                type: 'error',
                message: error.response?.data?.detail || 'Failed to update user status'
            }));
        }
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Invalid email format';
        }

        if (!formData.username.trim()) {
            errors.username = 'Username is required';
        }

        if (!formData.agency) {
            errors.agency = 'Agency is required';
        }

        if (formData.password && formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            await createUser({
                email: formData.email.trim(),
                username: formData.username.trim(),
                agency: formData.agency,
                role: formData.role,
                password: formData.password,
            });
            dispatch(addToast({ type: 'success', message: 'User created successfully' }));
            setIsCreateModalOpen(false);
            loadData();
        } catch (error) {
            const errorData = error.response?.data;
            if (errorData) {
                const errorMsg = errorData.email?.[0] ||
                    errorData.username?.[0] ||
                    errorData.detail ||
                    'Failed to create user';
                dispatch(addToast({ type: 'error', message: errorMsg }));
            } else {
                dispatch(addToast({ type: 'error', message: 'Failed to create user' }));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            await updateUser(selectedUser.id, {
                email: formData.email.trim(),
                username: formData.username.trim(),
                agency: formData.agency,
                role: formData.role,
                ...(formData.password ? { password: formData.password } : {}),
            });
            dispatch(addToast({ type: 'success', message: 'User updated successfully' }));
            setIsEditModalOpen(false);
            loadData();
        } catch (error) {
            const errorData = error.response?.data;
            if (errorData) {
                const errorMsg = errorData.email?.[0] ||
                    errorData.username?.[0] ||
                    errorData.detail ||
                    'Failed to update user';
                dispatch(addToast({ type: 'error', message: errorMsg }));
            } else {
                dispatch(addToast({ type: 'error', message: 'Failed to update user' }));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        setSubmitting(true);
        try {
            await deleteUser(selectedUser.id);
            dispatch(addToast({ type: 'success', message: 'User deleted successfully' }));
            setIsDeleteModalOpen(false);
            loadData();
        } catch (error) {
            const errorMsg = error.response?.data?.detail || 'Failed to delete user';
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
                                <Users className="h-8 w-8 text-teal-500" />
                                Users
                            </h1>
                            <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                                Manage system users and agency assignments
                            </p>
                        </div>
                        <Button
                            variant="primary"
                            size="md"
                            onClick={handleCreateClick}
                            className="cursor-pointer inline-flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Create User
                        </Button>
                    </header>

                    {/* Search Bar */}
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
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
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading users...</p>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4">
                                    <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {searchTerm ? 'No users found matching your search' : 'No users yet. Create one to get started.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Username
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Email
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Role
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Agency
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                            {filteredUsers.map((u) => (
                                                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {u.username}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {u.email || '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'superadmin'
                                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                            }`}>
                                                            {u.role || 'admin'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {u.agency_name || '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.is_active
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                            }`}>
                                                            {u.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        {u.role !== 'superadmin' && (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleToggleStatus(u)}
                                                                    className={`p-2 rounded-lg transition-colors ${u.is_active
                                                                        ? 'text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20'
                                                                        : 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
                                                                        }`}
                                                                    title={u.is_active ? 'Deactivate user' : 'Activate user'}
                                                                >
                                                                    {u.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEditClick(u)}
                                                                    className="p-2 text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                                                                    title="Edit user"
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteClick(u)}
                                                                    className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                    title="Delete user"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        )}
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
                title="Create User"
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
                            {submitting ? 'Creating...' : 'Create User'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg border ${formErrors.email
                                ? 'border-red-300 dark:border-red-600'
                                : 'border-gray-200 dark:border-gray-700'
                                } bg-white dark:bg-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500`}
                            placeholder="user@example.com"
                            autoFocus
                        />
                        {formErrors.email && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.email}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Username <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg border ${formErrors.username
                                ? 'border-red-300 dark:border-red-600'
                                : 'border-gray-200 dark:border-gray-700'
                                } bg-white dark:bg-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500`}
                            placeholder="johndoe"
                        />
                        {formErrors.username && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.username}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="agency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Agency <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="agency"
                            value={formData.agency}
                            onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg border ${formErrors.agency
                                ? 'border-red-300 dark:border-red-600'
                                : 'border-gray-200 dark:border-gray-700'
                                } bg-white dark:bg-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500`}
                        >
                            <option value="">Select an agency</option>
                            {agencies.map((agency) => (
                                <option key={agency.id} value={agency.id}>
                                    {agency.name}
                                </option>
                            ))}
                        </select>
                        {formErrors.agency && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.agency}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Role
                        </label>
                        <select
                            id="role"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="admin">Admin</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Currently only admin role is available for agency users
                        </p>
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg border ${formErrors.password
                                ? 'border-red-300 dark:border-red-600'
                                : 'border-gray-200 dark:border-gray-700'
                                } bg-white dark:bg-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500`}
                            placeholder="Leave blank to auto-generate"
                        />
                        {formErrors.password ? (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.password}</p>
                        ) : (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Minimum 8 characters if provided
                            </p>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit User"
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
                <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            id="edit-email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg border ${formErrors.email
                                ? 'border-red-300 dark:border-red-600'
                                : 'border-gray-200 dark:border-gray-700'
                                } bg-white dark:bg-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500`}
                            placeholder="user@example.com"
                            autoFocus
                        />
                        {formErrors.email && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.email}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Username <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="edit-username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg border ${formErrors.username
                                ? 'border-red-300 dark:border-red-600'
                                : 'border-gray-200 dark:border-gray-700'
                                } bg-white dark:bg-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500`}
                            placeholder="johndoe"
                        />
                        {formErrors.username && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.username}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="edit-agency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Agency <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="edit-agency"
                            value={formData.agency}
                            onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg border ${formErrors.agency
                                ? 'border-red-300 dark:border-red-600'
                                : 'border-gray-200 dark:border-gray-700'
                                } bg-white dark:bg-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500`}
                        >
                            <option value="">Select an agency</option>
                            {agencies.map((agency) => (
                                <option key={agency.id} value={agency.id}>
                                    {agency.name}
                                </option>
                            ))}
                        </select>
                        {formErrors.agency && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.agency}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Role
                        </label>
                        <select
                            id="edit-role"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="edit-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            New Password
                        </label>
                        <input
                            type="password"
                            id="edit-password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg border ${formErrors.password
                                ? 'border-red-300 dark:border-red-600'
                                : 'border-gray-200 dark:border-gray-700'
                                } bg-white dark:bg-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500`}
                            placeholder="Leave blank to keep current password"
                        />
                        {formErrors.password ? (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.password}</p>
                        ) : (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Minimum 8 characters if provided
                            </p>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete User"
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
                            {submitting ? 'Deleting...' : 'Delete User'}
                        </Button>
                    </>
                }
            >
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                        <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Are you sure you want to delete <span className="font-semibold">{selectedUser?.username}</span>?
                        This action cannot be undone.
                    </p>
                </div>
            </Modal>
        </div>
    );
};

export default UsersPage;
