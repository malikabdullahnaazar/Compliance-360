import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import PasswordInput from '../../components/inputs/PasswordInput';
import Button from '../../components/ui/Button';
import AppChrome from '../../components/layout/AppChrome';
import { setLoading, addToast } from '../../store/slices/uiSlice';
import api from '../../services/api';

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    const userId = location.state?.userId;
    const email = location.state?.email;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    // Redirect to login if they try to access this directly
    if (!userId || !email) {
        navigate('/login', { replace: true });
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        dispatch(setLoading({ isLoading: true, message: 'Resetting password...' }));
        try {
            await api.post('/auth/reset-password/', {
                user_id: userId,
                new_password: password,
                confirm_password: confirmPassword,
            });
            dispatch(setLoading({ isLoading: false, message: '' }));
            dispatch(addToast({ type: 'success', message: 'Password has been successfully changed.' }));
            navigate('/login');
        } catch (err) {
            dispatch(setLoading({ isLoading: false, message: '' }));
            setError(err.response?.data?.detail || 'Failed to reset password. Please try again.');
        }
    };

    return (
        <AppChrome variant="landing">
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-gray-50 via-teal-50/30 to-blue-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-8">
                <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Login
                    </button>

                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary-color-start)] to-[var(--primary-color-end)] text-white shadow-lg">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Reset Password
                        </h1>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Create a new password for <br /><span className="font-semibold text-gray-700 dark:text-gray-300">{email}</span>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <PasswordInput
                            id="password"
                            label="New Password"
                            value={password}
                            placeholder="••••••••"
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />

                        <PasswordInput
                            id="confirmPassword"
                            label="Confirm New Password"
                            value={confirmPassword}
                            placeholder="••••••••"
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            required
                        />

                        {error && (
                            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                <p className="font-medium">{error}</p>
                            </div>
                        )}

                        <Button
                            as="button"
                            type="submit"
                            className="w-full mt-2"
                            variant="primary"
                            size="md"
                        >
                            Reset Password
                        </Button>
                    </form>
                </div>
            </div>
        </AppChrome>
    );
};

export default ResetPasswordPage;
