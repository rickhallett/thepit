/**
 * Brutalist badge primitive.
 *
 * Encapsulates the rounded-full, border-2, uppercase tracking pattern
 * used for status indicators, tier labels, and agent name chips.
 */

import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

type BadgeVariant = 'default' | 'accent' | 'muted' | 'danger';
type BadgeSize = 'sm' | 'md';

const variantStyles: Record<BadgeVariant, string> = {
  default: 'border-foreground/60 text-foreground',
  accent: 'border-accent text-accent',
  muted: 'border-foreground/50 text-muted',
  danger: 'border-red-400 text-red-400',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px] tracking-[0.25em]',
  md: 'px-3 py-1 text-xs tracking-[0.3em]',
};

type PitBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
};

export function PitBadge({
  variant = 'default',
  size = 'md',
  className,
  ...props
}: PitBadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center rounded-full border-2 uppercase',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    />
  );
}
