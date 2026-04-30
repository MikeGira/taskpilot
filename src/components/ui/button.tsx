'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        // Vercel primary — white pill with hover glow
        default:
          'bg-white text-black hover:bg-zinc-100 active:bg-zinc-200 shadow-sm hover:shadow-[0_0_22px_rgba(255,255,255,0.22)] transition-shadow',
        // Dark outlined pill — secondary CTA
        outline:
          'border border-white/20 bg-transparent text-white hover:bg-white/6 hover:border-white/30',
        // Plain text — nav / ghost actions
        ghost:
          'text-[#888] hover:text-white hover:bg-white/5',
        // Destructive — only for delete/danger actions
        destructive:
          'bg-red-950 text-red-400 border border-red-900/60 hover:bg-red-900',
        // Success — semantic only
        success:
          'bg-emerald-700 text-white hover:bg-emerald-600',
        link:
          'text-white underline-offset-4 hover:underline p-0 h-auto rounded-none',
      },
      size: {
        default: 'h-10 px-5 text-sm',
        sm: 'h-10 px-4 text-sm',
        lg: 'h-10 px-8 text-sm',
        xl: 'h-10 px-10 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
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
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
