/**
 * Contract fixtures for the registry REST API: Platform Spec §5.1, API v1.
 * Recorded 2026-07. Update deliberately when the platform API version bumps
 * (CLAUDE.md testing rules).
 */
import type { Capabilities, EntryListResponse, RegistryEntry } from '../types';

export const echoAgent: RegistryEntry = {
  id: 'echo-1',
  name: 'Echo Agent',
  description: 'Echoes back whatever you send: the platform smoke-test agent.',
  kind: 'agent',
  status: 'healthy',
  tags: ['demo', 'echo'],
  url: 'https://api.test/a2a/echo',
  owner: 'demo',
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
  name: 'Summarizer',
  description: 'Summarizes documents and long text.',
  kind: 'agent',
  status: 'healthy',
  tags: ['nlp', 'text'],
  url: 'https://api.test/a2a/summarizer',
  owner: 'demo',
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
  name: 'Web Scraper',
  description: 'Fetches and extracts content from web pages.',
  kind: 'agent',
  status: 'unhealthy',
  tags: ['web'],
  url: 'https://api.test/a2a/scraper',
  owner: 'alice',
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
  name: 'Search MCP Server',
  description: 'MCP server exposing web search tools.',
  kind: 'mcp_server',
  status: 'starting',
  tags: ['mcp', 'search'],
  url: 'https://api.test/mcp/search',
  owner: 'alice',
  last_seen: null,
  created_at: '2026-07-12T09:00:00Z',
  updated_at: '2026-07-12T09:00:00Z',
  card: { name: 'Search MCP Server', tools: ['web_search'] },
};

export const entriesPage: EntryListResponse = {
  items: [echoAgent, summarizerAgent, scraperAgent, searchMcpServer],
  total: 4,
  page: 1,
  page_size: 50,
};

export const capabilitiesFixture: Capabilities = { semantic_search: true };
