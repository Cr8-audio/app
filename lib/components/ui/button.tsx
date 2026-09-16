import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import * as React from 'react';

import { cn } from '@/lib/utils/tailwind';

const buttonVariants = cva(
  'inline-flex items-center text-text justify-center whitespace-nowrap rounded-base text-sm font-base ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-main border-2 border-border dark:border-darkBorder shadow-light dark:shadow-dark hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none dark:hover:shadow-none active:bg-mainAccent active:scale-95 active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none',
        noShadow:
          'bg-main border-2 border-border dark:border-darkBorder active:bg-mainAccent active:scale-95',
        link: 'underline-offset-4 text-text dark:text-darkText hover:underline active:text-mainAccent2',
        neutral:
          'bg-white dark:bg-darkBg dark:text-darkText border-2 border-border dark:border-darkBorder shadow-light dark:shadow-dark hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none dark:hover:shadow-none active:bg-main active:scale-95 active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none',
        reverse:
          'bg-main border-2 border-border dark:border-darkBorder hover:translate-x-reverseBoxShadowX hover:translate-y-reverseBoxShadowY hover:shadow-light dark:hover:shadow-dark active:bg-mainAccent active:scale-95 active:translate-x-0 active:translate-y-0 active:shadow-none',
        chat: 'bg-main border-2 border-border dark:border-darkBorder hover:translate-x-reverseBoxShadowX hover:translate-y-reverseBoxShadowY hover:shadow-light dark:hover:shadow-dark active:bg-mainAccent active:scale-95 active:translate-x-0 active:translate-y-0 active:shadow-none',
        outline:
          'bg-main border-2 border-border dark:border-darkBorder hover:translate-x-reverseBoxShadowX hover:translate-y-reverseBoxShadowY hover:shadow-light dark:hover:shadow-dark active:bg-mainAccent active:scale-95 active:translate-x-0 active:translate-y-0 active:shadow-none',
        ghost:
          'bg-transparent border-2 border-border dark:border-darkBorder hover:translate-x-reverseBoxShadowX hover:translate-y-reverseBoxShadowY hover:shadow-light dark:hover:shadow-dark active:bg-main active:scale-95 active:translate-x-0 active:translate-y-0 active:shadow-none',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 active:scale-95',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
