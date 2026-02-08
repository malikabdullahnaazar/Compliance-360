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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
      <div className="flex items-center gap-4 rounded-xl bg-white px-6 py-4 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
        <div className="relative">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--primary-color)]" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {message || 'Loading...'}
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;

