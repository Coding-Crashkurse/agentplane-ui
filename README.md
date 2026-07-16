# agentplane-ui

SaaS frontend of the **agentplane** platform (learning project, MIT): portal/launchpad,
chat playground and registry management as a single-page application.

- One login for the platform (OIDC Authorization Code + PKCE against Keycloak, tokens in memory).
- **Launchpad**: config-driven tile grid for every platform module, filtered by user roles.
- **Chat playground**: talk to any registered agent via A2A v1.0 (`message/stream`, SSE)
  through the gateway.
- **Registry management**: search/filter entries, inspect cards, edit tags,
  register external agents, delete own entries.

See [SPEC.md](SPEC.md) for the full specification and [CLAUDE.md](CLAUDE.md) for the
engineering rules.

## Runtime configuration

The app fetches `GET /config.json` before first render and validates it with Zod;
the build contains no environment-specific values. Set `"demoAuth": true` for a
preview login without any IdP (the dev mock config enables it). In dev, a mock config is served
from [public/config.json](public/config.json); in compose it is bind-mounted, in
Kubernetes it comes from a ConfigMap.

## Development

```bash
npm ci
npm run dev            # vite dev server (mock config.json from /public)
npm run test           # vitest + RTL (MSW for HTTP)
npm run e2e            # playwright, expects the platform compose stack running
npm run lint && npm run typecheck && npm run format
npm run build          # production build
docker build -t agentplane-ui .
```

## Stack

React 19 + TypeScript (strict) + Vite · TanStack Query · Tailwind CSS ·
react-oidc-context · internal A2A client (JSON-RPC + SSE) · Vitest/RTL/MSW · Playwright.
