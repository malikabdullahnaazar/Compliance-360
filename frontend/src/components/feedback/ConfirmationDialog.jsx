import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { closeConfirmation, selectConfirmationModal } from '../../store/slices/uiSlice';

const variantIcon = {
  danger: AlertTriangle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
};

const ConfirmationDialog = ({ onConfirm }) => {
  const dispatch = useDispatch();
  const confirmation = useSelector(selectConfirmationModal);

  if (!confirmation.isOpen) {
    return null;
  }

  const Icon = variantIcon[confirmation.variant] || Info;

  const handleCancel = () => {
    dispatch(closeConfirmation());
  };

  const handleConfirm = () => {
    if (onConfirm && confirmation.onConfirmType) {
      onConfirm(confirmation.onConfirmType, confirmation.onConfirmPayload);
    }
    dispatch(closeConfirmation());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-dark-card">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/40">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {confirmation.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-200">
              {confirmation.message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="cursor-pointer rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-dark-border dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;

