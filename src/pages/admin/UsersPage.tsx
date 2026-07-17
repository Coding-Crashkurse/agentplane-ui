import { Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useKeycloakUsers, useUserRealmRoles } from '../../api/keycloak';
import type { KeycloakUser } from '../../api/keycloak';
import { Badge, type BadgeTone } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorNotice } from '../../components/ErrorNotice';
import { Spinner } from '../../components/Spinner';
import { Table, type Column } from '../../components/Table';
import { useDebounced } from '../../lib/useDebounced';
import { UserDrawer } from './UserDrawer';

const PAGE_SIZE = 20;

const ROLE_TONES: Record<string, BadgeTone> = {
  admin: 'amber',
  builder: 'blue',
  user: 'slate',
};

/** Role badges for a row: Keycloak has no bulk role endpoint, so this is per user. */
function UserRoleBadges({ userId }: { userId: string }) {
  const { data, isPending, isError } = useUserRealmRoles(userId);
  if (isPending) return <Spinner className="size-3.5" label="Loading roles" />;
  if (isError) return <span className="text-xs text-muted">unavailable</span>;
  const roles = data
    .map((role) => role.name)
    .filter((name) => !name.startsWith('default-roles'))
    .sort();
  if (roles.length === 0) return <span className="text-xs text-muted">none</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((name) => (
        <Badge key={name} tone={ROLE_TONES[name] ?? 'slate'}>
          {name}
        </Badge>
      ))}
    </div>
  );
}

const COLUMNS: Column<KeycloakUser>[] = [
  {
    key: 'username',
    header: 'Username',
    render: (user) => (
      <div className="min-w-40">
        <p className="font-medium text-ink">{user.username}</p>
        {(user.firstName || user.lastName) && (
          <p className="text-xs text-muted">
            {[user.firstName, user.lastName].filter(Boolean).join(' ')}
          </p>
        )}
      </div>
    ),
  },
  {
    key: 'email',
    header: 'Email',
    render: (user) => <span className="text-sm text-muted">{user.email ?? 'not set'}</span>,
  },
  {
    key: 'enabled',
    header: 'Status',
    render: (user) => (
      <Badge tone={user.enabled ? 'green' : 'slate'}>{user.enabled ? 'enabled' : 'disabled'}</Badge>
    ),
  },
  {
    key: 'roles',
    header: 'Roles',
    render: (user) => <UserRoleBadges userId={user.id} />,
  },
];

/**
 * Admin user management (SPEC §11): lists Keycloak users and lets an admin toggle
 * the `user`/`builder` roles, team membership, and enabled state. Every call goes
 * straight to the Keycloak Admin REST API with the admin's token; Keycloak is the
 * authorization gate, the UI is convenience only.
 */
export function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<KeycloakUser | null>(null);

  const debouncedSearch = useDebounced(search);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const { data, isPending, isError, error, refetch } = useKeycloakUsers({
    search: debouncedSearch || undefined,
    first: page * PAGE_SIZE,
    max: PAGE_SIZE,
  });

  // Keycloak's user list carries no total; a full page implies there may be more.
  const hasNextPage = (data?.length ?? 0) === PAGE_SIZE;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Users</h1>
        <p className="mt-1 text-muted">
          Manage roles, teams, and access for platform users. Keycloak enforces every change.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          aria-label="Search users"
          placeholder="Search by username, email, or name…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 w-full rounded-control border border-border bg-card pl-9 pr-3 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>

      {isPending ? (
        <div className="flex justify-center py-20">
          <Spinner className="size-7" label="Loading users" />
        </div>
      ) : isError ? (
        <ErrorNotice
          title="Users could not be loaded"
          detail={error instanceof Error ? error.message : undefined}
          action={
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        />
      ) : data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="Adjust your search, or create users in the Keycloak admin console."
        />
      ) : (
        <>
          <Table
            columns={COLUMNS}
            rows={data}
            rowKey={(user) => user.id}
            onRowClick={setSelected}
          />
          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              Page {page + 1} · showing {data.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!hasNextPage}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <UserDrawer user={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
