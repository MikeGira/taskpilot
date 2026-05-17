'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold select-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
    'disabled:pointer-events-none disabled:opacity-40',
    // Spring-physics press feel
    'transition-all duration-150 ease-out',
    'hover:-translate-y-px hover:scale-[1.025]',
    'active:translate-y-0 active:scale-[0.965] active:duration-75',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-white text-black shadow-sm ' +
          'hover:bg-zinc-50 hover:shadow-[0_0_28px_rgba(255,255,255,0.28),0_4px_16px_rgba(0,0,0,0.4)] ' +
          'active:bg-zinc-100 active:shadow-sm',
        outline:
          'border border-white/25 bg-transparent text-white ' +
          'hover:bg-white/8 hover:border-white/45 hover:shadow-[0_0_18px_rgba(255,255,255,0.07)] ' +
          'active:bg-white/12 active:border-white/30',
        ghost:
          'text-[#888] ' +
          'hover:text-white hover:bg-white/8 ' +
          'active:bg-white/12 active:text-white',
        destructive:
          'bg-red-950 text-red-400 border border-red-900/60 ' +
          'hover:bg-red-900 hover:border-red-700/60 hover:text-red-300 ' +
          'active:bg-red-950',
        success:
          'bg-emerald-700 text-white ' +
          'hover:bg-emerald-600 hover:shadow-[0_0_18px_rgba(52,211,153,0.25)] ' +
          'active:bg-emerald-700',
        link:
          'text-white underline-offset-4 hover:underline p-0 h-auto rounded-none ' +
          'hover:translate-y-0 hover:scale-100 active:scale-100',
      },
      size: {
        default: 'h-10 px-5 text-sm',
        sm:      'h-9  px-4 text-sm',
        lg:      'h-11 px-8 text-sm',
        xl:      'h-12 px-10 text-base',
        icon:    'h-10 w-10',
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
