import { describe, expect, it } from 'vitest';
import { resolveTraceLink } from './traceLink';

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';

describe('resolveTraceLink', () => {
  it('builds an exact deep link from traceUrlTemplate', () => {
    const link = resolveTraceLink(
      {
        traceUrlTemplate: 'https://langfuse.test/traces/{traceId}',
        langfuseUrl: 'https://langfuse.test',
      },
      TRACE_ID,
    );
    expect(link).toEqual({ href: `https://langfuse.test/traces/${TRACE_ID}`, exact: true });
  });

  it('substitutes every {traceId} occurrence in the template', () => {
    const link = resolveTraceLink(
      { traceUrlTemplate: 'https://t.test/{traceId}?highlight={traceId}' },
      TRACE_ID,
    );
    expect(link?.href).toBe(`https://t.test/${TRACE_ID}?highlight=${TRACE_ID}`);
  });

  it('falls back to a plain langfuseUrl link when no template is set', () => {
    const link = resolveTraceLink({ langfuseUrl: 'https://langfuse.test' }, TRACE_ID);
    expect(link).toEqual({ href: 'https://langfuse.test', exact: false });
  });

  it('falls back to langfuseUrl when a template is set but no traceId is known', () => {
    const link = resolveTraceLink(
      { traceUrlTemplate: 'https://t.test/{traceId}', langfuseUrl: 'https://langfuse.test' },
      undefined,
    );
    expect(link).toEqual({ href: 'https://langfuse.test', exact: false });
  });

  it('returns null when neither is configured', () => {
    expect(resolveTraceLink({}, TRACE_ID)).toBeNull();
  });
});
