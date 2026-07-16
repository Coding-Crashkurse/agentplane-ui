import type { User } from 'oidc-client-ts';
import { useAuth } from 'react-oidc-context';
import { useMemo } from 'react';
import { decodeJwtPayload } from '../lib/jwt';

/** Default role claim path per SPEC §4.1: `realm_access.roles` (Keycloak). */
function readRealmRoles(claim: unknown): string[] {
  if (claim && typeof claim === 'object' && Array.isArray((claim as { roles?: unknown }).roles)) {
    return (claim as { roles: unknown[] }).roles.filter((r): r is string => typeof r === 'string');
  }
  return [];
}

export function rolesFromUser(user: User | null | undefined): string[] {
  if (!user) return [];
  const profile = user.profile as Record<string, unknown>;
  const fromProfile = readRealmRoles(profile['realm_access']);
  if (fromProfile.length > 0) return fromProfile;
  return readRealmRoles(decodeJwtPayload(user.access_token)?.['realm_access']);
}

export function useRoles(): string[] {
  const auth = useAuth();
  const user = auth.user;
  return useMemo(() => rolesFromUser(user), [user]);
}

export function useIsAdmin(): boolean {
  return useRoles().includes('admin');
}

export function useUsername(): string | undefined {
  const auth = useAuth();
  const profile = auth.user?.profile;
  return profile?.preferred_username ?? profile?.name ?? profile?.sub;
}
