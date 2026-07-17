import type { FetchLike } from '../../auth/authorizedFetch';
import type { KeycloakGroup, KeycloakRole, KeycloakUser, UserQuery } from './types';

export class KeycloakApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Derives the Keycloak Admin REST base from an OIDC issuer:
 * `{base}/realms/{realm}` -> `{base}/admin/realms/{realm}` (SPEC §11). Handles
 * issuers with a path prefix (e.g. legacy `/auth/realms/{realm}`).
 */
export function deriveAdminApiUrl(issuer: string): string {
  const marker = '/realms/';
  const idx = issuer.lastIndexOf(marker);
  if (idx === -1) {
    throw new Error(
      `Cannot derive the Keycloak admin API URL from issuer "${issuer}": expected a "/realms/{realm}" path.`,
    );
  }
  const base = issuer.slice(0, idx).replace(/\/+$/, '');
  const realm = issuer.slice(idx + marker.length).replace(/\/+$/, '');
  return `${base}/admin/realms/${realm}`;
}

/**
 * The admin base: an explicit `adminApiUrl` override wins (absolute URL or a
 * same-origin path proxied by Caddy when CORS blocks the cross-origin call);
 * otherwise it is derived from `oidc.issuer`.
 */
export function resolveAdminApiUrl(config: {
  oidc: { issuer: string };
  adminApiUrl?: string;
}): string {
  const override = config.adminApiUrl?.trim();
  if (override) return override.replace(/\/+$/, '');
  return deriveAdminApiUrl(config.oidc.issuer);
}

async function errorFromResponse(response: Response): Promise<KeycloakApiError> {
  let message = `HTTP ${response.status}`;
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      // Keycloak surfaces admin-API failures under errorMessage/error/error_description.
      const candidate = record['errorMessage'] ?? record['error'] ?? record['error_description'];
      if (typeof candidate === 'string' && candidate.length > 0) message = candidate;
    }
  } catch {
    /* body was not JSON: keep the status message */
  }
  return new KeycloakApiError(response.status, message);
}

/**
 * Typed client for the Keycloak Admin REST API, called directly from the browser
 * with the admin's bearer token (SPEC §11). `baseUrl` is `{...}/admin/realms/{realm}`,
 * absolute or a same-origin path. Keycloak is the authorization gate, never the UI.
 */
export class KeycloakAdminClient {
  constructor(
    private baseUrl: string,
    private fetchFn: FetchLike,
  ) {}

  private url(path: string, sp?: URLSearchParams): string {
    const base = this.baseUrl.replace(/\/+$/, '');
    const query = sp && sp.size > 0 ? `?${sp.toString()}` : '';
    return `${base}${path}${query}`;
  }

  private async json<T>(response: Response): Promise<T> {
    if (!response.ok) throw await errorFromResponse(response);
    return (await response.json()) as T;
  }

  private async noContent(response: Response): Promise<void> {
    if (!response.ok) throw await errorFromResponse(response);
  }

  async listUsers(query: UserQuery = {}): Promise<KeycloakUser[]> {
    const sp = new URLSearchParams();
    if (query.search) sp.set('search', query.search);
    if (query.first !== undefined) sp.set('first', String(query.first));
    if (query.max !== undefined) sp.set('max', String(query.max));
    const response = await this.fetchFn(this.url('/users', sp), {
      headers: { Accept: 'application/json' },
    });
    return this.json<KeycloakUser[]>(response);
  }

  /** All realm roles (id + name); the page picks out `user` and `builder`. */
  async listRealmRoles(): Promise<KeycloakRole[]> {
    const response = await this.fetchFn(this.url('/roles'), {
      headers: { Accept: 'application/json' },
    });
    return this.json<KeycloakRole[]>(response);
  }

  async getUserRealmRoles(userId: string): Promise<KeycloakRole[]> {
    const response = await this.fetchFn(
      this.url(`/users/${encodeURIComponent(userId)}/role-mappings/realm`),
      { headers: { Accept: 'application/json' } },
    );
    return this.json<KeycloakRole[]>(response);
  }

  async addUserRealmRoles(userId: string, roles: KeycloakRole[]): Promise<void> {
    const response = await this.fetchFn(
      this.url(`/users/${encodeURIComponent(userId)}/role-mappings/realm`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(roles),
      },
    );
    return this.noContent(response);
  }

  async removeUserRealmRoles(userId: string, roles: KeycloakRole[]): Promise<void> {
    const response = await this.fetchFn(
      this.url(`/users/${encodeURIComponent(userId)}/role-mappings/realm`),
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(roles),
      },
    );
    return this.noContent(response);
  }

  /** Top-level groups (teams). */
  async listGroups(): Promise<KeycloakGroup[]> {
    const response = await this.fetchFn(this.url('/groups'), {
      headers: { Accept: 'application/json' },
    });
    return this.json<KeycloakGroup[]>(response);
  }

  /**
   * Realm roles mapped onto a group. Used to hide admin-conferring teams from
   * the UI: assigning such a group would grant the `admin` realm role, which
   * this UI must never offer (SPEC §11).
   */
  async getGroupRealmRoles(groupId: string): Promise<KeycloakRole[]> {
    const response = await this.fetchFn(
      this.url(`/groups/${encodeURIComponent(groupId)}/role-mappings/realm`),
      { headers: { Accept: 'application/json' } },
    );
    return this.json<KeycloakRole[]>(response);
  }

  async getUserGroups(userId: string): Promise<KeycloakGroup[]> {
    const response = await this.fetchFn(this.url(`/users/${encodeURIComponent(userId)}/groups`), {
      headers: { Accept: 'application/json' },
    });
    return this.json<KeycloakGroup[]>(response);
  }

  async addUserToGroup(userId: string, groupId: string): Promise<void> {
    const response = await this.fetchFn(
      this.url(`/users/${encodeURIComponent(userId)}/groups/${encodeURIComponent(groupId)}`),
      { method: 'PUT' },
    );
    return this.noContent(response);
  }

  async removeUserFromGroup(userId: string, groupId: string): Promise<void> {
    const response = await this.fetchFn(
      this.url(`/users/${encodeURIComponent(userId)}/groups/${encodeURIComponent(groupId)}`),
      { method: 'DELETE' },
    );
    return this.noContent(response);
  }

  /**
   * Enable/disable a user. Keycloak merges the partial representation, so only
   * `enabled` is sent; other fields keep their stored values.
   */
  async setUserEnabled(userId: string, enabled: boolean): Promise<void> {
    const response = await this.fetchFn(this.url(`/users/${encodeURIComponent(userId)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    return this.noContent(response);
  }
}
