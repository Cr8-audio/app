import * as React from 'react';
import { cn } from '@/lib/utils/tailwind';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={cn(
          'block w-full rounded-base border-2 border-gray-800 dark:border-darkBorder bg-white dark:bg-darkBg px-4 py-2 text-text dark:text-darkText shadow-light dark:shadow-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-50 transition-transform duration-300',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';

export { Input };
