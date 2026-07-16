import { useId, type SelectHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, className, id, children, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'h-10 rounded-control border border-border bg-card px-3 text-sm text-ink',
          'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
        )}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
