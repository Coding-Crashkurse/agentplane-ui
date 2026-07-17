/**
 * Keycloak Admin REST API types: hand-written mirror of the representations the
 * admin users page consumes (Keycloak 26). Only the fields the UI reads or sends
 * are modelled; the admin API accepts partial representations on writes.
 *
 * The UI calls these endpoints DIRECTLY from the browser with the logged-in
 * admin's bearer token. Keycloak enforces authorization server-side (SPEC §11);
 * the UI is convenience only. A 403 means the admin lacks the fine-grained
 * permission for that action and is surfaced verbatim.
 */

/** UserRepresentation (subset). */
export interface KeycloakUser {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified?: boolean;
}

/** RoleRepresentation (subset). Realm role mappings are posted as arrays of these. */
export interface KeycloakRole {
  id: string;
  name: string;
  description?: string;
  composite?: boolean;
  clientRole?: boolean;
  containerId?: string;
}

/** GroupRepresentation (subset). Teams are modelled as Keycloak groups. */
export interface KeycloakGroup {
  id: string;
  name: string;
  path?: string;
}

/** Query parameters for GET /users (server-side search + paging). */
export interface UserQuery {
  search?: string;
  first?: number;
  max?: number;
}
