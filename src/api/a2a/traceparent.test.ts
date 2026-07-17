import { describe, expect, it } from 'vitest';
import { TRACEPARENT_RE, newTraceparent } from './traceparent';

describe('newTraceparent', () => {
  it('produces a version-00 sampled W3C traceparent', () => {
    const { header, traceId } = newTraceparent();
    expect(header).toMatch(TRACEPARENT_RE);
    // The header embeds the returned trace id in the trace-id field.
    expect(header).toBe(`00-${traceId}-${header.split('-')[2]}-01`);
    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('generates a fresh id on each call', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newTraceparent().traceId));
    expect(ids.size).toBe(50);
  });
});
