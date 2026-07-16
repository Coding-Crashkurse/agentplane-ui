/**
 * Registry REST API types: hand-written mirror of Platform Spec §5.1
 * (repo `agentplane`), registry API v1. No codegen in v1 (SPEC §7).
 */

export type EntryKind = 'agent' | 'mcp_server';
export type EntryStatus = 'starting' | 'healthy' | 'unhealthy' | 'unknown';

export interface RegistryEntry {
  id: string;
  name: string;
  description: string;
  kind: EntryKind;
  status: EntryStatus;
  tags: string[];
  /** Public gateway URL: this IS the A2A endpoint for `kind: agent`. */
  url: string;
  owner: string;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
  /** Raw agent card / server manifest as registered. */
  card: Record<string, unknown>;
}

export interface EntryListResponse {
  items: RegistryEntry[];
  total: number;
  page: number;
  page_size: number;
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
  /** AND semantics; serialized comma-separated. */
  tags?: string[];
  /** `all` is admin-only: the API is the actual gate (SPEC §4.3). */
  owner?: 'all';
  page?: number;
  page_size?: number;
}

export interface ListResult {
  data: EntryListResponse;
  /** Value of the `X-Degraded` response header, e.g. "semantic" (SPEC §4.2). */
  degraded: string | null;
}
