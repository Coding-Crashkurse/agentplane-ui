import { Boxes, Plus, Search } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useEntries } from '../../api/registry/hooks';
import type { EntryKind, EntryStatus, RegistryEntry } from '../../api/registry/types';
import { useIsAdmin } from '../../auth';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorNotice } from '../../components/ErrorNotice';
import { Select } from '../../components/Select';
import { Spinner } from '../../components/Spinner';
import { StatusBadge } from '../../components/StatusBadge';
import { Table, type Column } from '../../components/Table';
import { Tag } from '../../components/Tag';
import { useDebounced } from '../../lib/useDebounced';
import { EntryDrawer } from './EntryDrawer';
import { RegisterExternalDrawer } from './RegisterExternalDrawer';
import { TagFilterInput } from './TagFilterInput';

const PAGE_SIZE = 50;

const COLUMNS: Column<RegistryEntry>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (entry) => (
      <div className="min-w-48">
        <p className="font-medium text-ink">{entry.name}</p>
        <p className="max-w-md truncate text-xs text-muted">{entry.description}</p>
      </div>
    ),
  },
  {
    key: 'kind',
    header: 'Kind',
    render: (entry) => (
      <Badge tone="blue">{entry.kind === 'mcp_server' ? 'MCP server' : 'agent'}</Badge>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (entry) => <StatusBadge status={entry.status} lastSeen={entry.last_seen} />,
  },
  {
    key: 'tags',
    header: 'Tags',
    render: (entry) => (
      <div className="flex flex-wrap gap-1">
        {entry.tags.slice(0, 3).map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
        {entry.tags.length > 3 && <Tag>+{entry.tags.length - 3}</Tag>}
      </div>
    ),
  },
  {
    key: 'owner',
    header: 'Owner',
    render: (entry) => <span className="text-sm text-muted">{entry.owner}</span>,
  },
  {
    key: 'updated',
    header: 'Updated',
    render: (entry) => (
      <span className="whitespace-nowrap text-sm text-muted">
        {new Date(entry.updated_at).toLocaleDateString()}
      </span>
    ),
  },
];

/** Registry management: search, filters, pagination, drawer, register flow (SPEC §4.3). */
export function RegistryPage() {
  const isAdmin = useIsAdmin();
  const allOwnersId = useId();

  const [query, setQuery] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [kind, setKind] = useState<'' | EntryKind>('');
  const [status, setStatus] = useState<'' | EntryStatus>('');
  const [allOwners, setAllOwners] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RegistryEntry | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  const debouncedQuery = useDebounced(query);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, tags, kind, status, allOwners]);

  const { data, isPending, isError, error, refetch } = useEntries({
    q: debouncedQuery || undefined,
    tags: tags.length > 0 ? tags : undefined,
    kind: kind || undefined,
    status: status || undefined,
    owner: allOwners ? 'all' : undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.data.total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Registry</h1>
          <p className="mt-1 text-muted">Agents and MCP servers registered on the platform.</p>
        </div>
        <Button onClick={() => setRegisterOpen(true)}>
          <Plus aria-hidden className="size-4" />
          Register external agent
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            aria-label="Search registry"
            placeholder="Search by name or description…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 w-full rounded-control border border-border bg-card pl-9 pr-3 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
        <div className="min-w-56">
          <TagFilterInput tags={tags} onChange={setTags} />
        </div>
        <Select
          aria-label="Filter by kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as '' | EntryKind)}
        >
          <option value="">All kinds</option>
          <option value="agent">Agents</option>
          <option value="mcp_server">MCP servers</option>
        </Select>
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => setStatus(event.target.value as '' | EntryStatus)}
        >
          <option value="">All statuses</option>
          <option value="healthy">Healthy</option>
          <option value="starting">Starting</option>
          <option value="unhealthy">Unhealthy</option>
          <option value="unknown">Unknown</option>
        </Select>
        {isAdmin && (
          <label htmlFor={allOwnersId} className="flex items-center gap-1.5 text-sm text-muted">
            <input
              id={allOwnersId}
              type="checkbox"
              checked={allOwners}
              onChange={(event) => setAllOwners(event.target.checked)}
              className="accent-accent"
            />
            Show all owners
          </label>
        )}
      </div>

      {data?.degraded?.includes('semantic') && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Semantic search is degraded: showing text results.
        </p>
      )}

      {isPending ? (
        <div className="flex justify-center py-20">
          <Spinner className="size-7" label="Loading registry" />
        </div>
      ) : isError ? (
        <ErrorNotice
          title="Registry could not be loaded"
          detail={error instanceof Error ? error.message : undefined}
          action={
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        />
      ) : data.data.items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No entries found"
          description="Adjust your filters, or register an external agent to get started."
          action={<Button onClick={() => setRegisterOpen(true)}>Register external agent</Button>}
        />
      ) : (
        <>
          <Table
            columns={COLUMNS}
            rows={data.data.items}
            rowKey={(entry) => entry.id}
            onRowClick={setSelected}
          />
          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              Page {data.data.page} of {totalPages} · {data.data.total} entries
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <EntryDrawer entry={selected} onClose={() => setSelected(null)} />
      <RegisterExternalDrawer open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </div>
  );
}
