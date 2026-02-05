import { cn } from '../../lib/utils';

const variantClasses = {
  primary:
    'bg-gradient-to-r from-[var(--primary-color-start)] to-[var(--primary-color-end)] text-white',
  outline:
    'border-2 border-[var(--primary-color-start)] text-[var(--primary-color-start)] hover:bg-[var(--primary-color-start)] hover:text-white',
  secondary:
    'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
  ghost:
    'text-gray-600 hover:bg-gray-100 focus:ring-gray-400 dark:text-gray-200 dark:hover:bg-gray-800',
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
    ? 'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--primary-focus-ring)]'
    : 'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 dark:focus:ring-gray-500';

const Button = ({
  as = 'button',
  type = 'button',
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const Component = as;
  const isPrimary = variant === 'primary';

  return (
    <Component
      type={as === 'button' ? type : undefined}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-md font-medium shadow-sm transition-colors',
        variantClasses[variant],
        isPrimary && hoverGradientClasses.primary,
        getFocusClasses(variant),
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Button;
