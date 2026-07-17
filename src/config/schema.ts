import { z } from 'zod';

export const launchpadLinkSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  icon: z.string().default('app'),
  url: z.string().url(),
  roles: z.array(z.string()).optional(),
});

export const configSchema = z.object({
  oidc: z.object({
    issuer: z.string().url(),
    clientId: z.string().min(1),
  }),
  registryUrl: z.string().url(),
  a2aBaseUrl: z.string().url(),
  langfuseUrl: z.string().url().optional(),
  /**
   * Keycloak Admin REST API base, e.g. `{base}/admin/realms/{realm}`. Optional:
   * when unset it is derived from `oidc.issuer` (SPEC §11). Set it to override
   * the derivation, e.g. a same-origin path `/kc-admin/admin/realms/agentplane`
   * proxied by Caddy when the browser cannot reach Keycloak cross-origin (CORS).
   * Absolute URL or same-origin path; not required to be a full URL.
   */
  adminApiUrl: z.string().min(1).optional(),
  /**
   * Trace deep-link template with a `{traceId}` placeholder (SPEC §12), e.g.
   * `https://langfuse.example/project/x/traces/{traceId}`. Optional; when unset
   * the chat falls back to a plain `langfuseUrl` link.
   */
  traceUrlTemplate: z.string().min(1).optional(),
  /** Preview-only fake login (no IdP contact); the APIs still enforce real auth. */
  demoAuth: z.boolean().default(false),
  links: z.array(launchpadLinkSchema).default([]),
});

export type AppConfig = z.infer<typeof configSchema>;
export type LaunchpadLink = z.infer<typeof launchpadLinkSchema>;
