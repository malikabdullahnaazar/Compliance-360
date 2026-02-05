import { useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';
import { selectIsLoading, selectLoadingMessage } from '../../store/slices/uiSlice';

const LoadingOverlay = () => {
  const isLoading = useSelector(selectIsLoading);
  const message = useSelector(selectLoadingMessage);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-lg dark:bg-dark-card">
        <Loader2 className="h-5 w-5 animate-spin text-primary-600" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {message || 'Loading...'}
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;

