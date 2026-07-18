import { useQuery } from '@tanstack/react-query';
import { useRegistryClient } from '../../api/registry/hooks';
import type { EntryStatus, StatusHistory } from '../../api/registry/types';
import { Spinner } from '../../components/Spinner';

const SEGMENT_CLASSES: Record<EntryStatus, string> = {
  healthy: 'bg-emerald-500',
  unhealthy: 'bg-red-500',
  starting: 'bg-amber-400',
  unknown: 'bg-slate-400',
};

interface Segment {
  status: EntryStatus;
  fraction: number;
  from: Date;
  to: Date;
}

/** Piecewise-constant timeline from transition events, clamped to the window. */
function segmentsFrom(history: StatusHistory, now: Date): Segment[] {
  const windowMs = history.window_h * 3_600_000;
  const windowStart = new Date(now.getTime() - windowMs);
  const segments: Segment[] = [];
  for (const [index, event] of history.items.entries()) {
    const from = new Date(Math.max(new Date(event.at).getTime(), windowStart.getTime()));
    const next = history.items[index + 1];
    const to = next ? new Date(next.at) : now;
    if (to.getTime() <= from.getTime()) continue;
    segments.push({
      status: event.status,
      fraction: (to.getTime() - from.getTime()) / windowMs,
      from,
      to,
    });
  }
  return segments;
}

function uptimePercent(segments: Segment[]): number | null {
  const covered = segments.reduce((sum, s) => sum + s.fraction, 0);
  if (covered <= 0) return null;
  const healthy = segments
    .filter((s) => s.status === 'healthy')
    .reduce((sum, s) => sum + s.fraction, 0);
  return Math.round((healthy / covered) * 100);
}

/** 24h status history bar with uptime summary (SPEC §4.3). */
export function StatusTimeline({ entryId }: { entryId: string }) {
  const client = useRegistryClient();
  const { data, isPending, isError } = useQuery({
    queryKey: ['entry-history', entryId],
    queryFn: () => client.history(entryId, 24),
  });

  if (isPending) return <Spinner className="size-4" label="Loading history" />;
  if (isError) return <p className="text-sm text-muted">History is not available.</p>;

  const now = new Date();
  const segments = segmentsFrom(data, now);
  if (segments.length === 0) {
    return <p className="text-sm text-muted">No status changes recorded yet.</p>;
  }
  const uptime = uptimePercent(segments);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="img"
        aria-label={`Status timeline, last ${data.window_h} hours`}
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface"
      >
        {segments.map((segment, index) => (
          <div
            key={index}
            className={SEGMENT_CLASSES[segment.status]}
            style={{ width: `${Math.max(segment.fraction * 100, 0.75)}%` }}
            title={`${segment.status}: ${segment.from.toLocaleTimeString()} – ${segment.to.toLocaleTimeString()}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted">
        Last {data.window_h}h{uptime !== null && <> · {uptime}% healthy</>} · history kept{' '}
        {Math.round(data.retention_h / 24)} days
      </p>
    </div>
  );
}
