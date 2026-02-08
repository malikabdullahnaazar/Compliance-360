import { cn } from '../../lib/utils';

const Card = ({
  className,
  children,
  as = 'div',
  ...props
}) => {
  const Component = as;
  return (
    <Component
      className={cn(
        'rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm',
        'dark:border-gray-800 dark:bg-gray-900 dark:text-white',
        'hover:shadow-md transition-all duration-200',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

const CardHeader = ({ className, children, ...props }) => (
  <div
    className={cn(
      'border-b border-gray-100 dark:border-gray-800 p-6',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

const CardContent = ({ className, children, ...props }) => (
  <div className={cn('p-6', className)} {...props}>
    {children}
  </div>
);

const CardFooter = ({ className, children, ...props }) => (
  <div
    className={cn(
      'border-t border-gray-100 dark:border-gray-800 p-6',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export default Card;
export { CardHeader, CardContent, CardFooter };
