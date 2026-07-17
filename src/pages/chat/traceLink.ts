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
 * Resolves the trace deep link for an assistant response. Prefers
 * `traceUrlTemplate` (with `{traceId}` substituted); otherwise falls back to a
 * plain `langfuseUrl` link. Returns null when neither is configured.
 */
export function resolveTraceLink(
  config: Pick<AppConfig, 'traceUrlTemplate' | 'langfuseUrl'>,
  traceId: string | undefined,
): TraceLink | null {
  if (config.traceUrlTemplate && traceId) {
    return { href: config.traceUrlTemplate.split('{traceId}').join(traceId), exact: true };
  }
  if (config.langfuseUrl) {
    return { href: config.langfuseUrl, exact: false };
  }
  return null;
}
