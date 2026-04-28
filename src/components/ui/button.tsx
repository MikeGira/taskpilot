'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        // Primary CTA — Vercel white, rectangular
        default:
          'bg-white text-black hover:bg-zinc-100 active:bg-zinc-200 rounded-md shadow-sm',
        // Red accent — AI/generate actions
        accent:
          'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 rounded-md shadow-sm shadow-red-900/30',
        // Outline — rectangular, sign-in / auth (Vercel style)
        outline:
          'border border-white/20 text-white hover:bg-white/6 hover:border-white/30 rounded-md',
        // Ghost — plain text
        ghost:
          'text-[#888] hover:text-white hover:bg-white/5 rounded-md',
        // Pill — nav links to other pages (cylindrical)
        pill:
          'border border-white/15 text-white hover:bg-white/6 hover:border-white/25 rounded-full',
        // Destructive
        destructive:
          'bg-red-950 text-red-400 border border-red-900 hover:bg-red-900 rounded-md',
        // Success (semantic emerald — kept separate from red accent)
        success:
          'bg-emerald-600 text-white hover:bg-emerald-700 rounded-md shadow-sm',
        link:
          'text-red-400 underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-9 px-5 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-7 text-base',
        xl: 'h-13 px-9 text-lg',
        icon: 'h-9 w-9',
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
