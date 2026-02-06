import { createPortal } from 'react-dom';
import { LogOut, X } from 'lucide-react';
import Button from '../ui/Button';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
                aria-labelledby="logout-title"
            >
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3">
                    <h3 id="logout-title" className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <LogOut className="h-4 w-4 text-gray-500" />
                        Confirm Logout
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                        <LogOut className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Are you sure you want to log out of your account? You will need to sign in again to access your dashboard.
                    </p>
                </div>

                <div className="flex gap-3 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:px-6">
                    <Button
                        variant="outline"
                        className="flex-1 justify-center"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        className="flex-1 justify-center bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 border-transparent focus:ring-red-500"
                        onClick={onConfirm}
                        autoFocus
                    >
                        Logout
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default LogoutModal;
