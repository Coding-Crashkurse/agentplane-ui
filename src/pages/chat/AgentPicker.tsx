import { Bot, Search } from 'lucide-react';
import { useId, useState } from 'react';
import { useCapabilities, useEntries } from '../../api/registry/hooks';
import type { RegistryEntry } from '../../api/registry/types';
import { EmptyState } from '../../components/EmptyState';
import { ErrorNotice } from '../../components/ErrorNotice';
import { Spinner } from '../../components/Spinner';
import { StatusBadge } from '../../components/StatusBadge';
import { cn } from '../../lib/cn';
import { useDebounced } from '../../lib/useDebounced';

/** Agent picker: search backed by /agents/search, healthy agents by default (SPEC §4.2). */
export function AgentPicker({
  selected,
  onSelect,
}: {
  selected: RegistryEntry | null;
  onSelect: (agent: RegistryEntry) => void;
}) {
  const [query, setQuery] = useState('');
  const [semantic, setSemantic] = useState(false);
  const [includeOthers, setIncludeOthers] = useState(false);
  const debouncedQuery = useDebounced(query);
  const capabilities = useCapabilities();
  const semanticId = useId();
  const includeId = useId();

  const { data, isPending, isError, error, refetch } = useEntries({
    q: debouncedQuery || undefined,
    semantic: semantic && capabilities.semantic_search ? true : undefined,
    kind: 'agent',
    status: includeOthers ? undefined : 'healthy',
    page_size: 50,
  });

  const degraded = data?.degraded?.includes('semantic') ?? false;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            aria-label="Search agents"
            placeholder="Search agents…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9 w-full rounded-control border border-border bg-card pl-9 pr-3 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-4 text-sm text-muted">
          {capabilities.semantic_search && (
            <label htmlFor={semanticId} className="flex items-center gap-1.5">
              <input
                id={semanticId}
                type="checkbox"
                checked={semantic}
                onChange={(event) => setSemantic(event.target.checked)}
                className="accent-accent"
              />
              Semantic
            </label>
          )}
          <label htmlFor={includeId} className="flex items-center gap-1.5">
            <input
              id={includeId}
              type="checkbox"
              checked={includeOthers}
              onChange={(event) => setIncludeOthers(event.target.checked)}
              className="accent-accent"
            />
            Include unhealthy
          </label>
        </div>
        {degraded && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Semantic search is degraded: showing text results.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isPending ? (
          <div className="flex justify-center py-10">
            <Spinner label="Loading agents" />
          </div>
        ) : isError ? (
          <ErrorNotice
            title="Agents could not be loaded"
            detail={error instanceof Error ? error.message : undefined}
            action={
              <button className="text-sm font-medium text-accent" onClick={() => void refetch()}>
                Retry
              </button>
            }
          />
        ) : data.data.items.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No agents found"
            description="Try a different search or include unhealthy agents."
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {data.data.items.map((entry) => (
              <li key={entry.id}>
                <button
                  onClick={() => onSelect(entry)}
                  aria-pressed={selected?.id === entry.id}
                  className={cn(
                    'w-full rounded-control border px-3 py-2 text-left transition-colors',
                    selected?.id === entry.id
                      ? 'border-accent bg-accent-soft'
                      : 'border-transparent hover:bg-surface',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-ink">{entry.name}</span>
                    <StatusBadge status={entry.status} lastSeen={entry.last_seen} />
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {entry.description}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
