import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

/** Inline error block for async views: every error state is explicit (SPEC §6). */
export function ErrorNotice({
  title = 'Something went wrong',
  detail,
  action,
}: {
  title?: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-card border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/40 dark:bg-red-500/10"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400"
        />
        <div>
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">{title}</p>
          {detail && (
            <p className="mt-0.5 text-sm break-words text-red-700/80 dark:text-red-300/80">
              {detail}
            </p>
          )}
          {action && <div className="mt-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}
