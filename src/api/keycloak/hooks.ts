import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthorizedFetch } from '../../auth/authorizedFetch';
import { useConfig } from '../../config';
import { KeycloakAdminClient, resolveAdminApiUrl } from './client';
import type { KeycloakGroup, KeycloakRole, UserQuery } from './types';

/**
 * Realm role that is never granted or revoked from this UI: admins are appointed
 * by the superuser (SPEC §11). A group that maps this role is a back door to
 * admin, so such groups are withheld from the assignable team list.
 */
export const ADMIN_REALM_ROLE = 'admin';

export function useKeycloakClient(): KeycloakAdminClient {
  const config = useConfig();
  const fetchFn = useAuthorizedFetch();
  return useMemo(
    () => new KeycloakAdminClient(resolveAdminApiUrl(config), fetchFn),
    [config, fetchFn],
  );
}

export function useKeycloakUsers(query: UserQuery) {
  const client = useKeycloakClient();
  return useQuery({
    queryKey: ['kc', 'users', query],
    queryFn: () => client.listUsers(query),
    placeholderData: keepPreviousData,
  });
}

/** All realm roles, fetched once; the page selects `user` and `builder`. */
export function useRealmRoles() {
  const client = useKeycloakClient();
  return useQuery({
    queryKey: ['kc', 'realm-roles'],
    queryFn: () => client.listRealmRoles(),
    staleTime: Infinity,
  });
}

export function useUserRealmRoles(userId: string | null) {
  const client = useKeycloakClient();
  return useQuery({
    queryKey: ['kc', 'user-realm-roles', userId],
    queryFn: () => client.getUserRealmRoles(userId!),
    enabled: userId !== null,
  });
}

export function useKeycloakGroups() {
  const client = useKeycloakClient();
  return useQuery({
    queryKey: ['kc', 'groups'],
    queryFn: () => client.listGroups(),
    staleTime: Infinity,
  });
}

/**
 * Realm roles mapped onto each of the given groups (one query per group; Keycloak
 * has no bulk endpoint). Results are index-aligned with `groupIds`.
 */
export function useGroupRealmRoles(groupIds: string[]) {
  const client = useKeycloakClient();
  return useQueries({
    queries: groupIds.map((groupId) => ({
      queryKey: ['kc', 'group-realm-roles', groupId],
      queryFn: () => client.getGroupRealmRoles(groupId),
      staleTime: Infinity,
    })),
  });
}

/**
 * Teams (Keycloak groups) that may be toggled from the admin UI. Any group that
 * confers the `admin` realm role is excluded — assigning it would grant admin,
 * which this page must never offer (SPEC §11). A group is withheld until its
 * roles have loaded, so a privileged group is never briefly rendered as
 * toggleable.
 */
export function useAssignableTeams(): {
  groups: KeycloakGroup[];
  isPending: boolean;
  error: Error | null;
} {
  const groups = useKeycloakGroups();
  const allGroups = groups.data ?? [];
  const roleQueries = useGroupRealmRoles(allGroups.map((group) => group.id));

  const rolesPending = roleQueries.some((query) => query.isPending);
  const rolesError = roleQueries.find((query) => query.error)?.error ?? null;

  const assignable = allGroups.filter((_group, index) => {
    const roles = roleQueries[index]?.data;
    if (!roles) return false;
    return !roles.some((role) => role.name === ADMIN_REALM_ROLE);
  });

  return {
    groups: assignable,
    isPending: groups.isPending || rolesPending,
    error: (groups.error ?? rolesError) as Error | null,
  };
}

export function useUserGroups(userId: string | null) {
  const client = useKeycloakClient();
  return useQuery({
    queryKey: ['kc', 'user-groups', userId],
    queryFn: () => client.getUserGroups(userId!),
    enabled: userId !== null,
  });
}

/** Grants or revokes a single realm role for a user (never `admin`: SPEC §11). */
export function useSetUserRealmRole(userId: string) {
  const client = useKeycloakClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ role, enabled }: { role: KeycloakRole; enabled: boolean }) =>
      enabled
        ? client.addUserRealmRoles(userId, [role])
        : client.removeUserRealmRoles(userId, [role]),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['kc', 'user-realm-roles', userId] }),
  });
}

export function useSetUserGroup(userId: string) {
  const client = useKeycloakClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, member }: { groupId: string; member: boolean }) =>
      member ? client.addUserToGroup(userId, groupId) : client.removeUserFromGroup(userId, groupId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kc', 'user-groups', userId] }),
  });
}

export function useSetUserEnabled(userId: string) {
  const client = useKeycloakClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => client.setUserEnabled(userId, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kc', 'users'] }),
  });
}
