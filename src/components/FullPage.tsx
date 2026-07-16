import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Spinner } from './Spinner';

export function FullPageSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <Spinner className="size-7" label={label} />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

/** Full-page notice: used for config errors so a bad config.json never white-screens (SPEC §3). */
export function FullPageMessage({
  tone = 'info',
  title,
  detail,
  action,
}: {
  tone?: 'info' | 'error';
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md rounded-card border border-border bg-card p-8 text-center shadow-xs">
        {tone === 'error' && (
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
            <AlertTriangle aria-hidden className="size-6 text-red-600 dark:text-red-400" />
          </div>
        )}
        <h1 className="text-xl font-bold text-ink">{title}</h1>
        {detail && <p className="mt-2 text-sm break-words text-muted">{detail}</p>}
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
