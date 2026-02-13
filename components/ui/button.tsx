/**
 * Brutalist button primitive.
 *
 * Encapsulates the rounded-full, border-2, uppercase tracking pattern
 * used throughout the site. Supports three variants and three sizes.
 */

import { cn } from '@/lib/cn';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'border-foreground/70 text-foreground hover:border-accent hover:text-accent',
  secondary:
    'border-foreground/50 text-muted hover:border-foreground hover:text-foreground',
  ghost:
    'border-foreground/40 text-muted hover:border-accent hover:text-accent',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-[10px] tracking-[0.25em]',
  md: 'px-3 py-1 text-xs tracking-[0.3em]',
  lg: 'px-4 py-2 text-xs tracking-[0.3em]',
};

type PitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function PitButton({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: PitButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'rounded-full border-2 uppercase transition hover:-translate-y-0.5',
        variantStyles[variant],
        sizeStyles[size],
        props.disabled && 'cursor-not-allowed opacity-50 hover:translate-y-0',
        className,
      )}
    />
  );
}
