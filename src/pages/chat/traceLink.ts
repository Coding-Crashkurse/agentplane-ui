import type { AppConfig } from '../../config';

export interface TraceLink {
  href: string;
  /**
   * True when the link targets a specific trace via `traceUrlTemplate`; false
   * when it falls back to the tracing UI root (`langfuseUrl`).
   *
   * Caveat (SPEC §12): even an `exact` link only lands on this response's trace
   * if the gateway and runtime propagated the incoming `traceparent`. If they
   * start a fresh trace instead, the backend has no trace under this id and the
   * link opens the tracing UI's default view.
   */
  exact: boolean;
}

/**
 * Route the target through Langfuse's sign-in page with `targetPath`: after
 * the (SSO) login the user lands exactly on the trace. Without this, an
 * unauthenticated visitor gets Langfuse's misleading "You do not have access
 * to this trace" error; with an active Keycloak session the extra hop is a
 * single click. `targetPath` must be a relative path (open-redirect guard).
 */
function throughSignIn(target: string): string {
  try {
    const url = new URL(target);
    const path = url.pathname + url.search;
    return `${url.origin}/auth/sign-in?targetPath=${encodeURIComponent(path)}`;
  } catch {
    return target;
  }
}

/**
 * Resolves the trace deep link for an assistant response. Prefers
 * `traceUrlTemplate` (with `{traceId}` substituted); otherwise falls back to a
 * plain `langfuseUrl` link. Returns null when neither is configured.
 */
export function resolveTraceLink(
  config: Pick<AppConfig, 'traceUrlTemplate' | 'langfuseUrl'>,
  traceId: string | undefined,
): TraceLink | null {
  if (config.traceUrlTemplate && traceId) {
    return {
      href: throughSignIn(config.traceUrlTemplate.split('{traceId}').join(traceId)),
      exact: true,
    };
  }
  if (config.langfuseUrl) {
    return { href: config.langfuseUrl, exact: false };
  }
  return null;
}
