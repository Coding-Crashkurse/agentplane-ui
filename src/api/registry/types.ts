/**
 * Registry REST API types: hand-written mirror of Platform Spec §5.1
 * (repo `agentplane`), registry API v1. No codegen in v1 (SPEC §7).
 *
 * Wire shape (verified against agentplane-registry 0.0.4+): entries carry
 * name/description inside `card`, pages use `limit`/`offset`, mutations go
 * through `PUT /agents/{id}`.
 */

export type EntryKind = 'agent' | 'mcp_server';
export type EntryStatus = 'starting' | 'healthy' | 'unhealthy' | 'unknown';

export interface RegistryEntry {
  id: string;
  kind: EntryKind;
  status: EntryStatus;
  /** Soft-disable: disabled entries are hidden from discovery and not health-checked. */
  enabled: boolean;
  tags: string[];
  /** Public gateway URL: this IS the A2A endpoint for `kind: agent`. */
  url: string;
  /** Owner subject (OIDC `sub`). */
  owner: string;
  group: string;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
  /** Raw agent card / server manifest as registered; carries name/description. */
  card: Record<string, unknown>;
}

/** Display name of an entry (the card is the source of truth). */
export function entryName(entry: RegistryEntry): string {
  const name = entry.card['name'];
  return typeof name === 'string' && name ? name : entry.id;
}

/** Display description of an entry (from the card; may be empty). */
export function entryDescription(entry: RegistryEntry): string {
  const description = entry.card['description'];
  return typeof description === 'string' ? description : '';
}

export interface EntryListResponse {
  items: RegistryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface StatusEvent {
  status: EntryStatus;
  at: string;
}

/**
 * Status transitions within a window; the first item may predate the window
 * (the state in effect at its start).
 */
export interface StatusHistory {
  items: StatusEvent[];
  window_h: number;
  retention_h: number;
}

export interface Capabilities {
  semantic_search: boolean;
}

export interface ListParams {
  q?: string;
  /** Only meaningful on /agents/search and only when capabilities report support. */
  semantic?: boolean;
  kind?: EntryKind;
  status?: EntryStatus;
  /** Filter by enabled state (list endpoint); omit for both. */
  enabled?: boolean;
  /** AND semantics; serialized comma-separated. */
  tags?: string[];
  /** `all` is admin-only: the API is the actual gate (SPEC §4.3). */
  owner?: 'all';
  /** 1-based UI page; translated to limit/offset on the wire. */
  page?: number;
  page_size?: number;
}

export interface ListResult {
  data: EntryListResponse;
  /** Value of the `X-Degraded` response header, e.g. "semantic" (SPEC §4.2). */
  degraded: string | null;
}
