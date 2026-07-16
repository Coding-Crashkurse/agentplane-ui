import type { EntryStatus } from '../api/registry/types';
import { Badge, type BadgeTone } from './Badge';

const STATUS_TONES: Record<EntryStatus, BadgeTone> = {
  healthy: 'green',
  unhealthy: 'red',
  starting: 'amber',
  unknown: 'slate',
};

/** Health badge with `last_seen` tooltip (SPEC §4.3). */
export function StatusBadge({
  status,
  lastSeen,
}: {
  status: EntryStatus;
  lastSeen?: string | null;
}) {
  const title = lastSeen ? `Last seen ${new Date(lastSeen).toLocaleString()}` : 'Never seen';
  return (
    <Badge tone={STATUS_TONES[status]} title={title}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  );
}
