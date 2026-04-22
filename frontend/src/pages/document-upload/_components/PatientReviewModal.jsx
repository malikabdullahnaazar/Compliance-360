import { useEffect, useMemo, useState } from 'react';
import {
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/ui/Button';

const toIsoDate = (mmddyyyy) => {
  const v = (mmddyyyy || '').trim();
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[1]}-${m[2]}`;
};

const toBackendDob = (value) => {
  const v = (value || '').trim();
  if (!v) return '';
  if (v.includes('/')) return v;
  return v;
};

const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];

const PatientReviewModal = ({
  isOpen,
  onClose,
  extractedPatient,
  ambiguousCandidates,
  onConfirm,
  isSubmitting,
  forceMissingIdentityError,
}) => {
  const initial = useMemo(() => {
    const p = extractedPatient || {};
    return {
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      date_of_birth: toIsoDate(p.date_of_birth) || '',
      gender: p.gender || '',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      city: p.city || '',
      state: p.state || '',
      zip_code: p.zip_code || '',
      status: 'Active',
      admission_date: '',
      name_identifier: '',
      selected_candidate_index: 0,
    };
  }, [extractedPatient]);

  const [formData, setFormData] = useState(initial);
  const [errors, setErrors] = useState({});

  const candidates = Array.isArray(ambiguousCandidates) ? ambiguousCandidates : [];

  useEffect(() => {
    if (!isOpen) return;
    setFormData(prev => ({
      ...prev,
      ...initial,
      selected_candidate_index: 0,
      name_identifier: prev.name_identifier || '',
    }));
    setErrors({});
  }, [isOpen, initial]);

  useEffect(() => {
    if (!isOpen) return;
    if (!candidates.length) return;
    setFormData(prev => ({ ...prev, selected_candidate_index: 0 }));
  }, [isOpen, candidates.length]);

  const applyCandidate = (idx) => {
    const c = candidates[idx] || {};
    setFormData(prev => ({
      ...prev,
      first_name: c.first_name || prev.first_name,
      last_name: c.last_name || prev.last_name,
      date_of_birth: toIsoDate(c.date_of_birth) || prev.date_of_birth,
      gender: c.gender || prev.gender,
      phone: c.phone || prev.phone,
      email: c.email || prev.email,
      address: c.address || prev.address,
      city: c.city || prev.city,
      state: c.state || prev.state,
      zip_code: c.zip_code || prev.zip_code,
      selected_candidate_index: idx,
    }));
  };

  const validate = () => {
    const next = {};
    if (!formData.first_name.trim()) next.first_name = 'First name is required';
    if (!formData.date_of_birth) next.date_of_birth = 'Date of birth is required';
    if (!formData.gender) next.gender = 'Gender is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleConfirm = () => {
    if (!validate()) return;
    onConfirm({
      ...formData,
      date_of_birth: toBackendDob(formData.date_of_birth),
      admission_date: formData.admission_date || '',
    });
  };

  const identityMissing = forceMissingIdentityError || (!initial.first_name && !initial.last_name && !initial.date_of_birth);

  const footer = (
    <>
      <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button type="button" variant="primary" onClick={handleConfirm} disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Patient & Attach Document'}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review & Confirm Patient Information"
      footer={footer}
      size="2xl"
    >
      {identityMissing && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              Could not automatically identify patient name and date of birth in this chart. Please upload a clearer document or manually
              create the patient first in the Patient section.
            </div>
          </div>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="mb-5 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900/40 dark:bg-yellow-900/10 dark:text-yellow-200">
          <div className="font-medium">Multiple patients detected – please choose the correct one.</div>
          <div className="mt-2">
            <label className="block text-xs font-medium mb-1">Detected patients</label>
            <select
              name="selected_candidate_index"
              value={formData.selected_candidate_index}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setFormData(prev => ({ ...prev, selected_candidate_index: idx }));
                applyCandidate(idx);
              }}
              className="block w-full rounded-md border border-yellow-200 bg-white px-3 py-2 text-sm dark:bg-gray-900 dark:border-yellow-900/40"
            >
              {candidates.map((c, idx) => (
                <option key={idx} value={idx}>
                  {(c.first_name || '')} {(c.last_name || '')} {c.date_of_birth ? `- DOB ${c.date_of_birth}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Personal Information</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className={`block w-full pl-10 pr-3 py-2 border ${errors.first_name ? 'border-red-300' : 'border-gray-300'} rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white`}
              />
            </div>
            {errors.first_name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.first_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                className={`block w-full pl-10 pr-3 py-2 border ${errors.date_of_birth ? 'border-red-300' : 'border-gray-300'} rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white`}
              />
            </div>
            {errors.date_of_birth && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date_of_birth}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border ${errors.gender ? 'border-red-300' : 'border-gray-300'} rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white`}
            >
              <option value="">Select gender</option>
              {genderOptions.map(g => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {errors.gender && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.gender}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Address Information</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Street Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
              <input
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
              <input
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP Code</label>
              <input
                name="zip_code"
                value={formData.zip_code}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admission Date</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                name="admission_date"
                value={formData.admission_date}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Additional identifier (only if prompted)
            </label>
            <input
              name="name_identifier"
              value={formData.name_identifier}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              placeholder="e.g., MRN 1234 or - Chart 04/21/2026"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PatientReviewModal;

