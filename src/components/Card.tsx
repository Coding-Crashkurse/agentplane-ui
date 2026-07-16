import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-border bg-card p-5 shadow-xs', className)}
      {...rest}
    />
  );
}
