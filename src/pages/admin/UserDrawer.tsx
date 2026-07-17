import { useId } from 'react';
import {
  useAssignableTeams,
  useRealmRoles,
  useSetUserEnabled,
  useSetUserGroup,
  useSetUserRealmRole,
  useUserGroups,
  useUserRealmRoles,
} from '../../api/keycloak';
import type { KeycloakUser } from '../../api/keycloak';
import { Drawer } from '../../components/Drawer';
import { ErrorNotice } from '../../components/ErrorNotice';
import { Spinner } from '../../components/Spinner';

/**
 * Realm roles this UI may toggle. `admin` is deliberately absent: admins are
 * appointed by the superuser, never granted from here (SPEC §11). Keycloak's
 * fine-grained permissions are the real gate; a disallowed change returns 403,
 * surfaced verbatim.
 */
const TOGGLEABLE_ROLES = ['user', 'builder'] as const;

function mutationError(...errors: (unknown | null)[]): string | null {
  for (const error of errors) {
    if (error instanceof Error) return error.message;
  }
  return null;
}

/** Per-user drawer: enable/disable, role toggles (user/builder), team membership. */
export function UserDrawer({ user, onClose }: { user: KeycloakUser | null; onClose: () => void }) {
  const userId = user?.id ?? null;

  const realmRoles = useRealmRoles();
  const userRoles = useUserRealmRoles(userId);
  const teams = useAssignableTeams();
  const userGroups = useUserGroups(userId);

  const setEnabled = useSetUserEnabled(userId ?? '');
  const setRole = useSetUserRealmRole(userId ?? '');
  const setGroup = useSetUserGroup(userId ?? '');

  const enabledSwitchId = useId();

  if (!user) return null;

  const currentRoleNames = new Set((userRoles.data ?? []).map((role) => role.name));
  const currentGroupIds = new Set((userGroups.data ?? []).map((group) => group.id));

  const rolesLoading = realmRoles.isPending || userRoles.isPending;
  const groupsLoading = teams.isPending || userGroups.isPending;

  const enableError = mutationError(setEnabled.error);
  const roleError = mutationError(setRole.error, realmRoles.error, userRoles.error);
  const groupError = mutationError(setGroup.error, teams.error, userGroups.error);

  return (
    <Drawer open onClose={onClose} title={user.username}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          {user.email && <p className="text-sm text-muted">{user.email}</p>}
          <p className="text-xs text-muted">Managed in Keycloak. The IdP enforces every change.</p>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Account</h3>
          <label htmlFor={enabledSwitchId} className="flex items-center gap-2.5 text-sm text-ink">
            <input
              id={enabledSwitchId}
              type="checkbox"
              className="size-4 accent-accent"
              checked={user.enabled}
              disabled={setEnabled.isPending}
              onChange={(event) => setEnabled.mutate(event.target.checked)}
            />
            {user.enabled ? 'Enabled' : 'Disabled'}
            {setEnabled.isPending && <Spinner className="size-3.5" label="Saving" />}
          </label>
          {enableError && <ErrorNotice title="Could not update the account" detail={enableError} />}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Roles</h3>
          {rolesLoading ? (
            <Spinner className="size-4" label="Loading roles" />
          ) : (
            <div className="flex flex-col gap-2">
              {TOGGLEABLE_ROLES.map((roleName) => {
                const role = realmRoles.data?.find((r) => r.name === roleName);
                const checked = currentRoleNames.has(roleName);
                const pending = setRole.isPending && setRole.variables?.role.name === roleName;
                return (
                  <label
                    key={roleName}
                    className="flex items-center gap-2.5 text-sm text-ink"
                    title={role ? undefined : `Role "${roleName}" is not defined in this realm.`}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-accent"
                      checked={checked}
                      disabled={!role || setRole.isPending}
                      onChange={(event) =>
                        role && setRole.mutate({ role, enabled: event.target.checked })
                      }
                    />
                    {roleName}
                    {pending && <Spinner className="size-3.5" label="Saving" />}
                  </label>
                );
              })}
            </div>
          )}
          {roleError && <ErrorNotice title="Could not update roles" detail={roleError} />}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Teams</h3>
          {groupsLoading ? (
            <Spinner className="size-4" label="Loading teams" />
          ) : teams.groups.length === 0 ? (
            <p className="text-sm text-muted">No teams defined.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {teams.groups.map((group) => {
                const member = currentGroupIds.has(group.id);
                const pending = setGroup.isPending && setGroup.variables?.groupId === group.id;
                return (
                  <label key={group.id} className="flex items-center gap-2.5 text-sm text-ink">
                    <input
                      type="checkbox"
                      className="size-4 accent-accent"
                      checked={member}
                      disabled={setGroup.isPending}
                      onChange={(event) =>
                        setGroup.mutate({ groupId: group.id, member: event.target.checked })
                      }
                    />
                    {group.name}
                    {pending && <Spinner className="size-3.5" label="Saving" />}
                  </label>
                );
              })}
            </div>
          )}
          {groupError && <ErrorNotice title="Could not update teams" detail={groupError} />}
        </section>

        <p className="border-t border-border pt-4 text-xs text-muted">
          Creating and deleting users is done in the Keycloak admin console.
        </p>
      </div>
    </Drawer>
  );
}
