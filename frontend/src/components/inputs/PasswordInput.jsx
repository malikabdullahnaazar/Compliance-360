import { useState, forwardRef } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { cn } from '../../lib/utils';

const PasswordInput = forwardRef(
  (
    {
      id = 'password',
      label = 'Password',
      error,
      className,
      wrapperClassName,
      ...props
    },
    ref,
  ) => {
    const [show, setShow] = useState(false);

    return (
      <div className={cn('mb-4', className, wrapperClassName)}>
        {label && (
          <label
            htmlFor={id}
            className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 dark:text-gray-500">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </span>
          <input
            id={id}
            ref={ref}
            type={show ? 'text' : 'password'}
            className={cn(
              'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900',
              'placeholder:text-gray-400',
              'focus:border-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-focus-ring)]',
              'dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500',
              'transition-colors duration-200',
              'pl-10 pr-10',
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '',
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShow((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
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

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;

