import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Mail, ArrowLeft } from 'lucide-react';
import TextInput from '../../components/inputs/TextInput';
import Button from '../../components/ui/Button';
import AppChrome from '../../components/layout/AppChrome';
import { setLoading, addToast } from '../../store/slices/uiSlice';
import api from '../../services/api';

const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError('Please enter your email address.');
            return;
        }

        dispatch(setLoading({ isLoading: true, message: 'Checking account...' }));

        try {
            const response = await api.post('/auth/forgot-password/', { email });
            dispatch(setLoading({ isLoading: false, message: '' }));

            // if we get a user_id, they exist
            if (response.data.user_id) {
                // Navigate to next step where they can change password
                // For simplicity, we just pass the user_id in state
                navigate('/reset-password', { state: { userId: response.data.user_id, email } });
            } else {
                // To prevent email enumeration, we just show a generic message
                dispatch(addToast({ type: 'success', message: 'If an account exists, a reset code has been sent.' }));
                navigate('/login');
            }
        } catch (err) {
            dispatch(setLoading({ isLoading: false, message: '' }));
            setError(err.response?.data?.detail || 'An error occurred. Please try again.');
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
                            <span className="text-3xl font-bold">C</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Forgot Password
                        </h1>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Enter your email address to reset your password.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <TextInput
                            id="email"
                            label="Email address"
                            type="email"
                            icon={Mail}
                            placeholder="name@company.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
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
                            className="w-full"
                            variant="primary"
                            size="md"
                        >
                            Continue
                        </Button>
                    </form>
                </div>
            </div>
        </AppChrome>
    );
};

export default ForgotPasswordPage;
