import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { testConfig } from '../test/utils';
import { ConfigError, loadConfig } from './load';

const CONFIG_URL = `${window.location.origin}/config.json`;

describe('loadConfig', () => {
  it('parses a valid config.json', async () => {
    server.use(http.get(CONFIG_URL, () => HttpResponse.json(testConfig)));
    const config = await loadConfig();
    expect(config.registryUrl).toBe('https://api.test/registry');
    expect(config.links).toHaveLength(2);
  });

  it('rejects with a clear error when config.json is malformed', async () => {
    server.use(http.get(CONFIG_URL, () => HttpResponse.json({ oidc: { issuer: 'not-a-url' } })));
    await expect(loadConfig()).rejects.toThrowError(ConfigError);
    await expect(loadConfig()).rejects.toThrowError(/config\.json is invalid/);
  });

  it('rejects when config.json is not valid JSON', async () => {
    server.use(http.get(CONFIG_URL, () => new HttpResponse('not json', { status: 200 })));
    await expect(loadConfig()).rejects.toThrowError(/not valid JSON/);
  });

  it('rejects when config.json cannot be loaded', async () => {
    server.use(http.get(CONFIG_URL, () => new HttpResponse(null, { status: 404 })));
    await expect(loadConfig()).rejects.toThrowError(/HTTP 404/);
  });
});
