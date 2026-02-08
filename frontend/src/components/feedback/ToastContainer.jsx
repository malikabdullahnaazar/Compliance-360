import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { removeToast, selectToasts } from '../../store/slices/uiSlice';

const typeIcon = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const typeStyles = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
  warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300',
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
};

const iconColors = {
  success: 'text-emerald-500 dark:text-emerald-400',
  error: 'text-red-500 dark:text-red-400',
  warning: 'text-amber-500 dark:text-amber-400',
  info: 'text-blue-500 dark:text-blue-400',
};

const ToastContainer = () => {
  const dispatch = useDispatch();
  const toasts = useSelector(selectToasts);

  useEffect(() => {
    toasts.forEach((toast) => {
      if (!toast.duration) {
        return;
      }
      const timer = setTimeout(() => {
        dispatch(removeToast(toast.id));
      }, toast.duration);
      return () => clearTimeout(timer);
    });
  }, [toasts, dispatch]);

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-50 flex w-full flex-col items-end gap-2 sm:w-auto">
      {toasts.map((toast) => {
        const Icon = typeIcon[toast.type] || Info;
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg',
              typeStyles[toast.type] || typeStyles.info
            )}
          >
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconColors[toast.type] || iconColors.info)} aria-hidden="true" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              type="button"
              className="shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              onClick={() => dispatch(removeToast(toast.id))}
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
