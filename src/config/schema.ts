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
  /** Preview-only fake login (no IdP contact); the APIs still enforce real auth. */
  demoAuth: z.boolean().default(false),
  links: z.array(launchpadLinkSchema).default([]),
});

export type AppConfig = z.infer<typeof configSchema>;
export type LaunchpadLink = z.infer<typeof launchpadLinkSchema>;
