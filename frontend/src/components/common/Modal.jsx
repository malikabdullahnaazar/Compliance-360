import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '../ui/Button';

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md' // sm, md, lg, xl
}) => {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
    };

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={`w-full ${sizeClasses[size]} overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200`}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3 sm:px-6">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex gap-3 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:px-6">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
