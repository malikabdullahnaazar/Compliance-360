import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { removeToast, selectToasts } from '../../store/slices/uiSlice';

const typeIcon = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
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
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg bg-slate-900 px-4 py-3 text-slate-50 shadow-lg dark:bg-dark-card"
          >
            <Icon className="mt-0.5 h-5 w-5" aria-hidden="true" />
            <p className="flex-1 text-sm">{toast.message}</p>
            <button
              type="button"
              className="cursor-pointer text-slate-400 hover:text-slate-100"
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

