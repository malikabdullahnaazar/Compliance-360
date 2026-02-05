import { cn } from '../../lib/utils';

const Card = ({
  className,
  children,
  as: Component = 'div',
  ...props
}) => (
  <Component
    className={cn(
      'rounded-lg border border-gray-200 bg-gray-50 text-gray-900 shadow',
      'dark:border-dark-border dark:bg-[#0A0A0A] dark:text-white',
      'transition-shadow',
      className,
    )}
    {...props}
  >
    {children}
  </Component>
);

const CardHeader = ({ className, children, ...props }) => (
  <div
    className={cn(
      'border-b border-gray-200 dark:border-dark-border p-6',
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
      'border-t border-gray-200 dark:border-dark-border p-6',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export default Card;
export { CardHeader, CardContent, CardFooter };
