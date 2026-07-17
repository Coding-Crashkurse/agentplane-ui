import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import {
  KeycloakAdminClient,
  KeycloakApiError,
  deriveAdminApiUrl,
  resolveAdminApiUrl,
} from './client';
import type { KeycloakRole } from './types';

const BASE = 'https://auth.test/admin/realms/agentplane';
const client = new KeycloakAdminClient(BASE, (input, init) => fetch(input, init));

describe('deriveAdminApiUrl', () => {
  it('maps {base}/realms/{realm} to {base}/admin/realms/{realm}', () => {
    expect(deriveAdminApiUrl('https://auth.test/realms/agentplane')).toBe(
      'https://auth.test/admin/realms/agentplane',
    );
  });

  it('preserves a path prefix (legacy /auth)', () => {
    expect(deriveAdminApiUrl('https://auth.test/auth/realms/agentplane')).toBe(
      'https://auth.test/auth/admin/realms/agentplane',
    );
  });

  it('tolerates a trailing slash on the issuer', () => {
    expect(deriveAdminApiUrl('https://auth.test/realms/agentplane/')).toBe(
      'https://auth.test/admin/realms/agentplane',
    );
  });

  it('throws when the issuer has no /realms/ segment', () => {
    expect(() => deriveAdminApiUrl('https://auth.test/nope')).toThrow(/realms/);
  });
});

describe('resolveAdminApiUrl', () => {
  const oidc = { issuer: 'https://auth.test/realms/agentplane' };

  it('derives from the issuer when no override is set', () => {
    expect(resolveAdminApiUrl({ oidc })).toBe('https://auth.test/admin/realms/agentplane');
  });

  it('uses an explicit absolute override', () => {
    expect(resolveAdminApiUrl({ oidc, adminApiUrl: 'https://kc.other/admin/realms/x/' })).toBe(
      'https://kc.other/admin/realms/x',
    );
  });

  it('uses a same-origin relative override verbatim (Caddy proxy path)', () => {
    expect(resolveAdminApiUrl({ oidc, adminApiUrl: '/kc-admin/admin/realms/agentplane' })).toBe(
      '/kc-admin/admin/realms/agentplane',
    );
  });
});

describe('KeycloakAdminClient', () => {
  it('lists users with search + paging params', async () => {
    let seen: URLSearchParams | undefined;
    server.use(
      http.get(`${BASE}/users`, ({ request }) => {
        seen = new URL(request.url).searchParams;
        return HttpResponse.json([
          { id: 'u1', username: 'demo-admin', email: 'a@b.c', enabled: true },
        ]);
      }),
    );
    const users = await client.listUsers({ search: 'demo', first: 20, max: 20 });
    expect(users).toHaveLength(1);
    expect(seen?.get('search')).toBe('demo');
    expect(seen?.get('first')).toBe('20');
    expect(seen?.get('max')).toBe('20');
  });

  it('posts a role-representation array when adding a realm role', async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/users/u1/role-mappings/realm`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const role: KeycloakRole = { id: 'r-builder', name: 'builder' };
    await client.addUserRealmRoles('u1', [role]);
    expect(body).toEqual([{ id: 'r-builder', name: 'builder' }]);
  });

  it('sends a role-representation array on the DELETE body when removing a realm role', async () => {
    let body: unknown;
    let method: string | undefined;
    server.use(
      http.delete(`${BASE}/users/u1/role-mappings/realm`, async ({ request }) => {
        method = request.method;
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await client.removeUserRealmRoles('u1', [{ id: 'r-user', name: 'user' }]);
    expect(method).toBe('DELETE');
    expect(body).toEqual([{ id: 'r-user', name: 'user' }]);
  });

  it('fetches a group’s realm role mappings', async () => {
    server.use(
      http.get(`${BASE}/groups/g-admins/role-mappings/realm`, () =>
        HttpResponse.json([{ id: 'r-admin', name: 'admin' }]),
      ),
    );
    const roles = await client.getGroupRealmRoles('g-admins');
    expect(roles).toEqual([{ id: 'r-admin', name: 'admin' }]);
  });

  it('toggles group membership with PUT and DELETE', async () => {
    const calls: string[] = [];
    server.use(
      http.put(`${BASE}/users/u1/groups/g1`, () => {
        calls.push('PUT');
        return new HttpResponse(null, { status: 204 });
      }),
      http.delete(`${BASE}/users/u1/groups/g1`, () => {
        calls.push('DELETE');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await client.addUserToGroup('u1', 'g1');
    await client.removeUserFromGroup('u1', 'g1');
    expect(calls).toEqual(['PUT', 'DELETE']);
  });

  it('sends only { enabled } when disabling a user', async () => {
    let body: unknown;
    server.use(
      http.put(`${BASE}/users/u1`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await client.setUserEnabled('u1', false);
    expect(body).toEqual({ enabled: false });
  });

  it('surfaces a Keycloak 403 errorMessage verbatim', async () => {
    server.use(
      http.post(`${BASE}/users/u1/role-mappings/realm`, () =>
        HttpResponse.json(
          { error: 'unknown_error', errorMessage: 'insufficient_permissions to map role admin' },
          { status: 403 },
        ),
      ),
    );
    const failure = client.addUserRealmRoles('u1', [{ id: 'r-admin', name: 'admin' }]);
    await expect(failure).rejects.toBeInstanceOf(KeycloakApiError);
    await expect(failure).rejects.toThrowError('insufficient_permissions to map role admin');
  });
});
