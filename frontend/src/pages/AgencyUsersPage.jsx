import { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Users,
    Plus,
    Edit2,
    Trash2,
    ArrowLeft,
    Search,
    Power,
    PowerOff,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Filter,
    Eye,
    EyeOff
} from 'lucide-react';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';
import Card, { CardContent } from '../components/ui/Card';
import Modal from '../components/common/Modal';
import { getUsers, createUser, updateUser, deleteUser, toggleUserStatus } from '../services/admin.service';
import { useDispatch } from 'react-redux';
import { addToast } from '../store/slices/uiSlice';

const AgencyUsersPage = () => {
    const { user } = useContext(AuthContext);
    const dispatch = useDispatch();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Data & Pagination State
    const [users, setUsers] = useState([]);
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [ordering, setOrdering] = useState('-date_joined');
    const [statusFilter, setStatusFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [agencyFilter, setAgencyFilter] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        role: 'clinician',
    });
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                page_size: pageSize,
                ordering: ordering,
                search: searchTerm,
                is_active: statusFilter,
                role: roleFilter,
                agency: agencyFilter
            };

            const usersData = await getUsers(params);

            if (usersData.results) {
                setUsers(usersData.results);
                setTotalCount(usersData.count);
            } else {
                setUsers(Array.isArray(usersData) ? usersData : []);
                setTotalCount(Array.isArray(usersData) ? usersData.length : 0);
            }

        } catch (error) {
            dispatch(addToast({
                type: 'error',
                message: error.response?.data?.detail || 'Failed to load data'
            }));
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, ordering, searchTerm, statusFilter, roleFilter, agencyFilter, dispatch]);



    useEffect(() => {
        loadData();
    }, [loadData]);


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
        setFormData({
            email: '',
            username: '',
            role: 'clinician',
            password: '',
        });
        setFormErrors({});
        setShowPassword(false);
        setIsCreateModalOpen(true);
    };

    const handleEditClick = (u) => {
        setSelectedUser(u);
        setFormData({
            email: u.email || '',
            username: u.username || '',
            role: u.role || 'clinician',
            password: '',
        });
        setFormErrors({});
        setShowPassword(false);
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
                role: formData.role,
                ...(formData.password ? { password: formData.password } : {}),
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

    const totalPages = Math.ceil(totalCount / pageSize);

    if (!user || user.role !== 'agency_admin') {
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
                                        <Users className="h-8 w-8 text-teal-500" />
                                        Users
                                    </h1>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        Manage system users and agency assignments
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
                                        Create User
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
                                                placeholder="Search users..."
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
                                                    value={roleFilter}
                                                    onChange={(e) => {
                                                        setRoleFilter(e.target.value);
                                                        setCurrentPage(1);
                                                    }}
                                                >
                                                    <option value="">All Roles</option>
                                                    <option value="qa_compliance">QA/Compliance Officer</option>
                                                    <option value="clinician">Clinician</option>
                                                </select>
                                            </div>

                                            <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-3">
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
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Loading users...</p>
                                        </div>
                                    ) : users.length === 0 ? (
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
                                                        <th
                                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                                                            onClick={() => handleSort('username')}
                                                        >
                                                            <div className="flex items-center">
                                                                Username
                                                                {getSortIcon('username')}
                                                            </div>
                                                        </th>
                                                        <th
                                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                                                            onClick={() => handleSort('email')}
                                                        >
                                                            <div className="flex items-center">
                                                                Email
                                                                {getSortIcon('email')}
                                                            </div>
                                                        </th>
                                                        <th
                                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                                                            onClick={() => handleSort('role')}
                                                        >
                                                            <div className="flex items-center">
                                                                Role
                                                                {getSortIcon('role')}
                                                            </div>
                                                        </th>

                                                        <th
                                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                                                            onClick={() => handleSort('is_active')}
                                                        >
                                                            <div className="flex items-center">
                                                                Status
                                                                {getSortIcon('is_active')}
                                                            </div>
                                                        </th>
                                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {users.map((u) => (
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
                                                                    {u.role === 'qa_compliance' ? 'QA/Compliance Officer' : (u.role === 'clinician' ? 'Clinician' : u.role)}
                                                                </span>
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
                                                                {(u.role === 'qa_compliance' || u.role === 'clinician') && (
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
                <form onSubmit={handleCreateSubmit} className="space-y-4" autoComplete="off">
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
                            autoComplete="off"
                        />
                        {formErrors.username && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.username}</p>
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
                            <option value="clinician">Clinician</option>
                            <option value="qa_compliance">QA/Compliance Officer</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Select the role for the new user.
                        </p>
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className={`w-full pl-3 pr-10 py-2 rounded-lg border ${formErrors.password
                                    ? 'border-red-300 dark:border-red-600'
                                    : 'border-gray-200 dark:border-gray-700'
                                    } bg-white dark:bg-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500`}
                                placeholder="Leave blank to auto-generate"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 cursor-pointer"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
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
                        <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Role
                        </label>
                        <select
                            id="edit-role"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="clinician">Clinician</option>
                            <option value="qa_compliance">QA/Compliance Officer</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="edit-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="edit-password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className={`w-full pl-3 pr-10 py-2 rounded-lg border ${formErrors.password
                                    ? 'border-red-300 dark:border-red-600'
                                    : 'border-gray-200 dark:border-gray-700'
                                    } bg-white dark:bg-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500`}
                                placeholder="Leave blank to keep current password"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 cursor-pointer"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
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

export default AgencyUsersPage;
