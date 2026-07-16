import { useQuery } from '@tanstack/react-query';
import { useRegistryClient } from '../../api/registry/hooks';
import type { EntryStatus } from '../../api/registry/types';
import { StatusBadge } from '../../components/StatusBadge';

const STATUS_ORDER: EntryStatus[] = ['healthy', 'starting', 'unhealthy', 'unknown'];

/** Registry stats by status: soft-fails to nothing when the registry is unreachable (SPEC §4.1). */
export function StatsStrip() {
  const client = useRegistryClient();
  const { data } = useQuery({
    queryKey: ['launchpad-stats'],
    queryFn: () => client.list({ page_size: 100 }),
    retry: false,
  });

  if (!data) return null;

  const counts = new Map<EntryStatus, number>();
  for (const entry of data.data.items) {
    counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
  }

  return (
    <div
      data-testid="stats-strip"
      className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface px-4 py-3"
    >
      <span className="text-sm font-medium text-muted">
        {data.data.total} registry {data.data.total === 1 ? 'entry' : 'entries'}
      </span>
      {STATUS_ORDER.filter((status) => (counts.get(status) ?? 0) > 0).map((status) => (
        <span key={status} className="inline-flex items-center gap-1.5 text-sm text-muted">
          <StatusBadge status={status} />
          {counts.get(status)}
        </span>
      ))}
    </div>
  );
}
