/**
 * W3C Trace Context `traceparent` generation (SPEC §12). Every A2A request
 * carries one so the exchange can be correlated with a distributed trace. The
 * UI keeps the trace id per sent message to build a deep link; whether that link
 * lands on the exact trace depends on the gateway/runtime propagating the header.
 */

/** Matches a version-00, sampled traceparent: `00-{32 hex}-{16 hex}-01`. */
export const TRACEPARENT_RE = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/;

export interface Traceparent {
  /** The full `traceparent` header value. */
  header: string;
  /** The 32-hex trace id, kept to build a trace deep link. */
  traceId: string;
}

function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

/** Generates a fresh sampled traceparent using the platform CSPRNG. */
export function newTraceparent(): Traceparent {
  const crypto = globalThis.crypto;
  const traceId = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const parentId = toHex(crypto.getRandomValues(new Uint8Array(8)));
  return { header: `00-${traceId}-${parentId}-01`, traceId };
}
