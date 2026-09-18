import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import * as React from 'react';

import { cn } from '@/lib/utils/tailwind';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.7rem] text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_10px_24px_-16px_hsl(236_72%_42%)] hover:bg-primary/92 active:scale-[0.98]',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/92 active:scale-[0.98]',
        outline:
          'border border-border bg-card text-foreground hover:border-foreground/20 hover:bg-muted active:scale-[0.98]',
        ghost:
          'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98]',
        link: 'text-primary underline-offset-4 hover:underline',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        // Older names, kept so existing callers render in the new system.
        noShadow: 'bg-primary text-primary-foreground hover:bg-primary/92',
        neutral: 'bg-secondary text-secondary-foreground hover:bg-secondary/92',
        reverse: 'bg-secondary text-secondary-foreground hover:bg-secondary/92',
        chat: 'bg-secondary text-secondary-foreground hover:bg-secondary/92',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-9 px-3.5 text-xs',
        lg: 'h-12 px-6',
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
