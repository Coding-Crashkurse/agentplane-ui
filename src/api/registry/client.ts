import type { FetchLike } from '../../auth/authorizedFetch';
import type {
  Capabilities,
  EntryListResponse,
  ListParams,
  ListResult,
  RegistryEntry,
} from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

function toSearchParams(params: ListParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.semantic) sp.set('semantic', 'true');
  if (params.kind) sp.set('kind', params.kind);
  if (params.status) sp.set('status', params.status);
  if (params.enabled !== undefined) sp.set('enabled', String(params.enabled));
  if (params.tags && params.tags.length > 0) sp.set('tags', params.tags.join(','));
  if (params.owner) sp.set('owner', params.owner);
  const pageSize = params.page_size ?? 50;
  if (params.page_size) sp.set('limit', String(pageSize));
  if (params.page && params.page > 1) sp.set('offset', String((params.page - 1) * pageSize));
  return sp;
}

async function errorFromResponse(response: Response): Promise<ApiError> {
  let message = `HTTP ${response.status}`;
  let details: unknown;
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      const nested = record['error'];
      if (nested && typeof nested === 'object') {
        const nestedRecord = nested as Record<string, unknown>;
        if (typeof nestedRecord['message'] === 'string') message = nestedRecord['message'];
        details = nestedRecord['details'];
      } else if (typeof record['message'] === 'string') {
        message = record['message'];
      } else if (typeof record['detail'] === 'string') {
        message = record['detail'];
      }
    }
  } catch {
    /* body was not JSON: keep the status message */
  }
  return new ApiError(response.status, message, details);
}

/** Typed client for the registry REST API (Platform Spec §5.1), gateway URL only. */
export class RegistryClient {
  constructor(
    private baseUrl: string,
    private fetchFn: FetchLike,
  ) {}

  private url(path: string, sp?: URLSearchParams): string {
    const query = sp && sp.size > 0 ? `?${sp.toString()}` : '';
    return `${this.baseUrl.replace(/\/+$/, '')}${path}${query}`;
  }

  private async json<T>(response: Response): Promise<T> {
    if (!response.ok) throw await errorFromResponse(response);
    return (await response.json()) as T;
  }

  private async listWith(path: string, sp: URLSearchParams): Promise<ListResult> {
    const response = await this.fetchFn(this.url(path, sp), {
      headers: { Accept: 'application/json' },
    });
    return {
      data: await this.json<EntryListResponse>(response),
      degraded: response.headers.get('X-Degraded'),
    };
  }

  list(params: ListParams = {}): Promise<ListResult> {
    return this.listWith('/agents', toSearchParams(params));
  }

  search(params: ListParams): Promise<ListResult> {
    // Management view: include disabled entries (discovery defaults to hiding
    // them server-side; visibility itself stays enforced by the API).
    const sp = toSearchParams(params);
    sp.set('include_disabled', 'true');
    return this.listWith('/agents/search', sp);
  }

  async get(id: string): Promise<RegistryEntry> {
    const response = await this.fetchFn(this.url(`/agents/${encodeURIComponent(id)}`), {
      headers: { Accept: 'application/json' },
    });
    return this.json<RegistryEntry>(response);
  }

  /** Register an external agent: gateway URL + its fetched card (SPEC §4.3). */
  async register(url: string, card: Record<string, unknown>): Promise<RegistryEntry> {
    const response = await this.fetchFn(this.url('/agents'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ kind: 'agent', card, url }),
    });
    return this.json<RegistryEntry>(response);
  }

  private async patch(id: string, body: Record<string, unknown>): Promise<RegistryEntry> {
    const response = await this.fetchFn(this.url(`/agents/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    return this.json<RegistryEntry>(response);
  }

  updateTags(id: string, tags: string[]): Promise<RegistryEntry> {
    return this.patch(id, { tags });
  }

  /** Soft-disable / re-enable an entry (kept listed; hidden from discovery). */
  setEnabled(id: string, enabled: boolean): Promise<RegistryEntry> {
    return this.patch(id, { enabled });
  }

  async remove(id: string): Promise<void> {
    const response = await this.fetchFn(this.url(`/agents/${encodeURIComponent(id)}`), {
      method: 'DELETE',
    });
    if (!response.ok) throw await errorFromResponse(response);
  }

  async capabilities(): Promise<Capabilities> {
    const response = await this.fetchFn(this.url('/capabilities'), {
      headers: { Accept: 'application/json' },
    });
    return this.json<Capabilities>(response);
  }
}
