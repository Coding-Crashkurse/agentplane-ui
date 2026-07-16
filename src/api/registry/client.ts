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
  if (params.tags && params.tags.length > 0) sp.set('tags', params.tags.join(','));
  if (params.owner) sp.set('owner', params.owner);
  if (params.page) sp.set('page', String(params.page));
  if (params.page_size) sp.set('page_size', String(params.page_size));
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

  private async listAt(path: string, params: ListParams): Promise<ListResult> {
    const response = await this.fetchFn(this.url(path, toSearchParams(params)), {
      headers: { Accept: 'application/json' },
    });
    return {
      data: await this.json<EntryListResponse>(response),
      degraded: response.headers.get('X-Degraded'),
    };
  }

  list(params: ListParams = {}): Promise<ListResult> {
    return this.listAt('/agents', params);
  }

  search(params: ListParams): Promise<ListResult> {
    return this.listAt('/agents/search', params);
  }

  async get(id: string): Promise<RegistryEntry> {
    const response = await this.fetchFn(this.url(`/agents/${encodeURIComponent(id)}`), {
      headers: { Accept: 'application/json' },
    });
    return this.json<RegistryEntry>(response);
  }

  /** Register an external agent by its gateway URL (SPEC §4.3). */
  async register(url: string): Promise<RegistryEntry> {
    const response = await this.fetchFn(this.url('/agents'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ url }),
    });
    return this.json<RegistryEntry>(response);
  }

  async updateTags(id: string, tags: string[]): Promise<RegistryEntry> {
    const response = await this.fetchFn(this.url(`/agents/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ tags }),
    });
    return this.json<RegistryEntry>(response);
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
