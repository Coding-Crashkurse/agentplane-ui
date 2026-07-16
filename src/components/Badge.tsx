import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type BadgeTone = 'green' | 'red' | 'amber' | 'slate' | 'blue';

const TONES: Record<BadgeTone, string> = {
  green:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',
  amber:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  slate: 'bg-surface text-muted border-border',
  blue: 'bg-accent-soft text-accent border-cyan-200 dark:border-cyan-500/30',
};

export function Badge({
  tone = 'slate',
  children,
  title,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
