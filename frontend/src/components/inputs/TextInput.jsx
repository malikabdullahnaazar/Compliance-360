import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const TextInput = forwardRef(
  (
    {
      id,
      label,
      type = 'text',
      icon: Icon,
      error,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div className={cn('mb-4', className)}>
        {label && (
          <label
            htmlFor={id}
            className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <input
            id={id}
            ref={ref}
            type={type}
            className={cn(
              'block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
              'dark:border-dark-border dark:bg-dark-card dark:text-slate-100',
              Icon ? 'pl-9' : '',
              error ? 'border-red-500 focus:ring-red-500' : '',
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);

TextInput.displayName = 'TextInput';

export default TextInput;

