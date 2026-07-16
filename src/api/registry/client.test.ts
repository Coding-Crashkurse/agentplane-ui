import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import { entriesPage } from './__fixtures__/entries';
import { ApiError, RegistryClient } from './client';

const BASE = 'https://api.test/registry';
const client = new RegistryClient(BASE, (input, init) => fetch(input, init));

describe('RegistryClient', () => {
  it('serializes list params (tags AND comma-separated, owner=all, pagination)', async () => {
    let url: URL | null = null;
    server.use(
      http.get(`${BASE}/agents`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(entriesPage);
      }),
    );
    await client.list({
      kind: 'agent',
      status: 'healthy',
      tags: ['nlp', 'text'],
      owner: 'all',
      page: 2,
      page_size: 50,
    });
    const params = url!.searchParams;
    expect(params.get('kind')).toBe('agent');
    expect(params.get('status')).toBe('healthy');
    expect(params.get('tags')).toBe('nlp,text');
    expect(params.get('owner')).toBe('all');
    expect(params.get('page')).toBe('2');
    expect(params.get('page_size')).toBe('50');
  });

  it('surfaces the X-Degraded header from search responses', async () => {
    server.use(
      http.get(`${BASE}/agents/search`, () =>
        HttpResponse.json(entriesPage, { headers: { 'X-Degraded': 'semantic' } }),
      ),
    );
    const result = await client.search({ q: 'echo', semantic: true });
    expect(result.degraded).toBe('semantic');
    expect(result.data.items).toHaveLength(4);
  });

  it('throws ApiError with the API message on validation failure', async () => {
    server.use(
      http.post(`${BASE}/agents`, () =>
        HttpResponse.json(
          { error: { code: 'invalid_url', message: 'URL must be a public gateway URL' } },
          { status: 400 },
        ),
      ),
    );
    const failure = client.register('http://10.0.0.1/internal');
    await expect(failure).rejects.toThrowError(ApiError);
    await expect(failure).rejects.toThrowError('URL must be a public gateway URL');
  });

  it('deletes without expecting a body', async () => {
    server.use(http.delete(`${BASE}/agents/echo-1`, () => new HttpResponse(null, { status: 204 })));
    await expect(client.remove('echo-1')).resolves.toBeUndefined();
  });
});
