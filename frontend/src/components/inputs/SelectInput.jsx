import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const SelectInput = forwardRef(
  (
    {
      id,
      label,
      options,
      placeholder = 'Select an option',
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
          <select
            id={id}
            ref={ref}
            className={cn(
              'block w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
              'dark:border-dark-border dark:bg-dark-card dark:text-slate-100',
              error ? 'border-red-500 focus:ring-red-500' : '',
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </span>
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

SelectInput.displayName = 'SelectInput';

export default SelectInput;

