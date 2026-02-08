import { cn } from '../../lib/utils';

const variantClasses = {
  primary:
    'bg-gradient-to-r from-[var(--primary-color-start)] to-[var(--primary-color-end)] text-white shadow-md hover:shadow-lg',
  outline:
    'border-2 border-[var(--primary-color-start)] text-[var(--primary-color-start)] hover:bg-[var(--primary-color-start)] hover:text-white hover:shadow-md',
  secondary:
    'bg-gray-100 text-gray-900 hover:bg-gray-200 hover:shadow-sm dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
  ghost:
    'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-400 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
};

const hoverGradientClasses = {
  primary:
    'hover:from-[var(--primary-hover-start)] hover:to-[var(--primary-hover-end)]',
};

const sizeClasses = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-8 py-4 text-lg font-semibold',
};

const getFocusClasses = (variant) =>
  variant === 'primary' || variant === 'outline'
    ? 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-focus-ring)]'
    : 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-gray-500';

const disabledClasses = 'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0';

const Button = ({
  as = 'button',
  type = 'button',
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}) => {
  const Component = as;
  const isPrimary = variant === 'primary';

  return (
    <Component
      type={as === 'button' ? type : undefined}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 ease-out',
        'active:scale-[0.98] hover:-translate-y-0.5',
        variantClasses[variant],
        isPrimary && hoverGradientClasses.primary,
        getFocusClasses(variant),
        sizeClasses[size],
        disabledClasses,
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Button;
