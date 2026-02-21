import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    User,
    Calendar,
    Phone,
    Mail,
    MapPin,
    Building2,
    AlertCircle,
    CheckCircle,
    ArrowLeft,
    Save,
    Trash2
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import { patientService } from '../services/patient.service';
import { addToast } from '../store/slices/uiSlice';
import { useDispatch } from 'react-redux';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Modal from '../components/common/Modal';

const PatientDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dob: '',
        gender: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        insuranceProvider: '',
        policyNumber: '',
        referringPhysician: '',
        admissionDate: '',
        status: 'Active'
    });
    const [errors, setErrors] = useState({});
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const fetchPatientData = async () => {
            try {
                const response = await patientService.getPatientById(id);
                const patient = response.data;
                setFormData({
                    firstName: patient.first_name || '',
                    lastName: patient.last_name || '',
                    dob: patient.date_of_birth || '',
                    gender: patient.gender || '',
                    phone: patient.phone || '',
                    email: patient.email || '',
                    address: patient.address || '',
                    city: patient.city || '',
                    state: patient.state || '',
                    zipCode: patient.zip_code || '',
                    emergencyContactName: patient.emergency_contact_name || '',
                    emergencyContactPhone: patient.emergency_contact_phone || '',
                    insuranceProvider: patient.insurance_provider || '',
                    policyNumber: patient.policy_number || '',
                    referringPhysician: patient.referring_physician || '',
                    admissionDate: patient.admission_date || '',
                    status: patient.status || 'Active'
                });
                setIsLoading(false);
            } catch (error) {
                console.error('Error fetching patient:', error);
                dispatch(addToast({ type: 'error', message: 'Failed to load patient data' }));
                navigate('/patients');
            }
        };

        fetchPatientData();
    }, [id, navigate, dispatch]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.dob) newErrors.dob = 'Date of birth is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.address.trim()) newErrors.address = 'Street address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.status) newErrors.status = 'Status is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const patientData = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                date_of_birth: formData.dob,
                gender: formData.gender,
                phone: formData.phone,
                email: formData.email,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                zip_code: formData.zipCode,
                emergency_contact_name: formData.emergencyContactName,
                emergency_contact_phone: formData.emergencyContactPhone,
                insurance_provider: formData.insuranceProvider,
                policy_number: formData.policyNumber,
                referring_physician: formData.referringPhysician,
                admission_date: formData.admissionDate,
                status: formData.status
            };

            await patientService.updatePatient(id, patientData);
            dispatch(addToast({ type: 'success', message: 'Patient updated successfully!' }));
            setIsSubmitting(false);
        } catch (error) {
            console.error('Error updating patient:', error);
            dispatch(addToast({ type: 'error', message: 'Failed to update patient' }));
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            setDeleting(true);
            await patientService.deletePatient(id);
            dispatch(addToast({ type: 'success', message: 'Patient deleted successfully' }));
            navigate('/patients');
        } catch (error) {
            console.error('Error deleting patient:', error);
            dispatch(addToast({ type: 'error', message: 'Failed to delete patient' }));
        } finally {
            setDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--background)] dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            </div>
        );
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
                <div className="mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
                    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <button
                                onClick={() => navigate('/patients')}
                                className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Back to Patients
                            </button>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Patient Details
                            </h1>
                            <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                                View and edit information for {formData.firstName} {formData.lastName}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/50"
                                onClick={() => setIsDeleteModalOpen(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Patient
                            </Button>
                        </div>
                    </div>

                    <Card>
                        <CardHeader className="py-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Edit Information
                            </h2>
                        </CardHeader>
                        <CardContent className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    {/* Personal Information */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Personal Information</h3>

                                        <div>
                                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                First Name <span className="required-asterisk">*</span>
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <User className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    id="firstName"
                                                    name="firstName"
                                                    value={formData.firstName}
                                                    onChange={handleChange}
                                                    className={`block w-full pl-10 pr-3 py-2 border ${errors.firstName ? 'border-red-300' : 'border-gray-300'
                                                        } rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white`}
                                                />
                                            </div>
                                            {errors.firstName && (
                                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Last Name <span className="required-asterisk">*</span>
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <User className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    id="lastName"
                                                    name="lastName"
                                                    value={formData.lastName}
                                                    onChange={handleChange}
                                                    className={`block w-full pl-10 pr-3 py-2 border ${errors.lastName ? 'border-red-300' : 'border-gray-300'
                                                        } rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white`}
                                                />
                                            </div>
                                            {errors.lastName && (
                                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Date of Birth <span className="required-asterisk">*</span>
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-200" />
                                                </div>
                                                <input
                                                    type="date"
                                                    id="dob"
                                                    name="dob"
                                                    value={formData.dob}
                                                    onChange={handleChange}
                                                    className={`block w-full pl-10 pr-3 py-2 border ${errors.dob ? 'border-red-300' : 'border-gray-300'
                                                        } rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white`}
                                                />
                                            </div>
                                            {errors.dob && (
                                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.dob}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Gender <span className="required-asterisk">*</span>
                                            </label>
                                            <select
                                                id="gender"
                                                name="gender"
                                                value={formData.gender}
                                                onChange={handleChange}
                                                className={`block w-full pl-3 pr-10 py-2 border ${errors.gender ? 'border-red-300' : 'border-gray-300'} rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white`}
                                            >
                                                <option value="">Select gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                                <option value="Prefer not to say">Prefer not to say</option>
                                            </select>
                                            {errors.gender && (
                                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.gender}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Phone Number
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Phone className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    id="phone"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                                    placeholder="(555) 123-4567"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Email Address
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Mail className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="email"
                                                    id="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                                    placeholder="patient@example.com"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Address & System Information */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Address Information</h3>

                                        <div>
                                            <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Street Address <span className="required-asterisk">*</span>
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <MapPin className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    id="address"
                                                    name="address"
                                                    value={formData.address}
                                                    onChange={handleChange}
                                                    className={`block w-full pl-10 pr-3 py-2 border ${errors.address ? 'border-red-300' : 'border-gray-300'} rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white`}
                                                />
                                            </div>
                                            {errors.address && (
                                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.address}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    City <span className="required-asterisk">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    id="city"
                                                    name="city"
                                                    value={formData.city}
                                                    onChange={handleChange}
                                                    className={`block w-full pl-3 pr-3 py-2 border ${errors.city ? 'border-red-300' : 'border-gray-300'} rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white`}
                                                />
                                                {errors.city && (
                                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.city}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    State
                                                </label>
                                                <input
                                                    type="text"
                                                    id="state"
                                                    name="state"
                                                    value={formData.state}
                                                    onChange={handleChange}
                                                    className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                                    placeholder="ST"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    ZIP Code
                                                </label>
                                                <input
                                                    type="text"
                                                    id="zipCode"
                                                    name="zipCode"
                                                    value={formData.zipCode}
                                                    onChange={handleChange}
                                                    className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                                    placeholder="12345"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Status <span className="required-asterisk">*</span>
                                                </label>
                                                <select
                                                    id="status"
                                                    name="status"
                                                    value={formData.status}
                                                    onChange={handleChange}
                                                    className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                                >
                                                    <option value="Active">Active</option>
                                                    <option value="Pending">Pending</option>
                                                    <option value="Inactive">Inactive</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="admissionDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Admission Date
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-200" />
                                                </div>
                                                <input
                                                    type="date"
                                                    id="admissionDate"
                                                    name="admissionDate"
                                                    value={formData.admissionDate}
                                                    onChange={handleChange}
                                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex justify-end space-x-3 pt-6 border-t dark:border-gray-800">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => navigate('/patients')}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        disabled={isSubmitting}
                                        className="flex items-center gap-2"
                                    >
                                        <Save className="h-4 w-4" />
                                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </form>
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
                        Are you sure you want to delete <span className="font-semibold">{formData.firstName} {formData.lastName}</span>?
                        This action cannot be undone and will remove all associated records.
                    </p>
                </div>
            </Modal>
        </div >
    );
};

export default PatientDetailPage;
