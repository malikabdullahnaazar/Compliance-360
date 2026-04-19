import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { Settings, X, KeyRound } from 'lucide-react';
import Button from '../ui/Button';

const ResetPasswordModal = ({ isOpen, onClose, onConfirm, submitting, email = '', username = '' }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setConfirmPassword('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setError('');
        onConfirm(password);
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reset-password-title"
            >
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3">
                    <h3 id="reset-password-title" className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Settings className="h-4 w-4 text-gray-500" />
                        Settings - Reset Password
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                        disabled={submitting}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-4 sm:p-6">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <KeyRound className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-sm text-center text-gray-600 dark:text-gray-300 mb-4">
                            Please enter your new password below.
                        </p>

                        <div className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                            <div>
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</span>
                                <p className="mt-0.5 truncate text-sm text-gray-900 dark:text-gray-100" title={email || '—'}>
                                    {email || '—'}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Username</span>
                                <p className="mt-0.5 truncate text-sm text-gray-900 dark:text-gray-100" title={username || '—'}>
                                    {username || '—'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                    placeholder="••••••••"
                                    disabled={submitting}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                    placeholder="••••••••"
                                    disabled={submitting}
                                    required
                                />
                            </div>
                        </div>
                        {error && <p className="mt-4 text-xs font-medium text-red-600 dark:text-red-400 text-center">{error}</p>}
                    </div>

                    <div className="flex gap-3 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:px-6">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1 justify-center"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1 justify-center"
                            disabled={submitting}
                        >
                            {submitting ? 'Updating...' : 'Update Password'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default ResetPasswordModal;
