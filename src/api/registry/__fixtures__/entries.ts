/**
 * Contract fixtures for the registry REST API: Platform Spec §5.1, API v1.
 * Recorded 2026-07. Update deliberately when the platform API version bumps
 * (CLAUDE.md testing rules).
 */
import type { Capabilities, EntryListResponse, RegistryEntry } from '../types';

export const echoAgent: RegistryEntry = {
  id: 'echo-1',
  kind: 'agent',
  status: 'healthy',
  enabled: true,
  tags: ['demo', 'echo'],
  url: 'https://api.test/a2a/echo',
  owner: 'demo',
  owner_name: 'Demo Admin',
  group: '',
  last_seen: '2026-07-12T10:00:00Z',
  created_at: '2026-07-01T09:00:00Z',
  updated_at: '2026-07-10T09:00:00Z',
  card: {
    protocolVersion: '1.0',
    name: 'Echo Agent',
    description: 'Echoes back whatever you send.',
    url: 'https://api.test/a2a/echo',
    version: '1.0.0',
    capabilities: { streaming: true },
    skills: [{ id: 'echo', name: 'Echo', description: 'Returns the input text.', tags: ['demo'] }],
  },
};

export const summarizerAgent: RegistryEntry = {
  id: 'summarizer-1',
  kind: 'agent',
  status: 'healthy',
  enabled: true,
  tags: ['nlp', 'text'],
  url: 'https://api.test/a2a/summarizer',
  owner: 'demo',
  owner_name: 'Demo Admin',
  group: '',
  last_seen: '2026-07-12T09:58:00Z',
  created_at: '2026-06-20T09:00:00Z',
  updated_at: '2026-07-11T09:00:00Z',
  card: {
    protocolVersion: '1.0',
    name: 'Summarizer',
    url: 'https://api.test/a2a/summarizer',
    capabilities: { streaming: true },
    skills: [{ id: 'summarize', name: 'Summarize', description: 'Summarizes input text.' }],
  },
};

export const scraperAgent: RegistryEntry = {
  id: 'scraper-1',
  kind: 'agent',
  status: 'unhealthy',
  enabled: true,
  tags: ['web'],
  url: 'https://api.test/a2a/scraper',
  owner: 'alice',
  owner_name: '',
  group: '',
  last_seen: '2026-07-10T08:00:00Z',
  created_at: '2026-06-01T09:00:00Z',
  updated_at: '2026-07-10T08:00:00Z',
  card: {
    protocolVersion: '1.0',
    name: 'Web Scraper',
    url: 'https://api.test/a2a/scraper',
    capabilities: { streaming: false },
    skills: [],
  },
};

export const searchMcpServer: RegistryEntry = {
  id: 'mcp-search-1',
  kind: 'mcp_server',
  status: 'starting',
  enabled: true,
  tags: ['mcp', 'search'],
  url: 'https://api.test/mcp/search',
  owner: 'alice',
  owner_name: '',
  group: '',
  last_seen: null,
  created_at: '2026-07-12T09:00:00Z',
  updated_at: '2026-07-12T09:00:00Z',
  card: { name: 'Search MCP Server', description: 'MCP server exposing web search tools.', tools: ['web_search'] },
};

export const entriesPage: EntryListResponse = {
  items: [echoAgent, summarizerAgent, scraperAgent, searchMcpServer],
  total: 4,
  limit: 50,
  offset: 0,
};

export const capabilitiesFixture: Capabilities = { semantic_search: true };
