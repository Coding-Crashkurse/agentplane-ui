import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import { sseResponse } from '../../test/handlers';
import { echoStreamFrames, sseBody, sseErrorBody } from './__fixtures__/stream';
import { A2AError } from './client';
import { JsonRpcA2AClient } from './jsonRpcClient';
import { TRACEPARENT_RE } from './traceparent';
import type { StreamEvent } from './types';

const AGENT_URL = 'https://api.test/a2a/echo';
const client = new JsonRpcA2AClient((input, init) => fetch(input, init));

async function collect(stream: AsyncGenerator<StreamEvent>): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

describe('JsonRpcA2AClient', () => {
  it('streams events in order and sends the A2A-Version and traceparent headers', async () => {
    let version: string | null = null;
    let traceparent: string | null = null;
    let method: string | undefined;
    server.use(
      http.post(AGENT_URL, async ({ request }) => {
        version = request.headers.get('A2A-Version');
        traceparent = request.headers.get('traceparent');
        method = ((await request.json()) as { method: string }).method;
        return sseResponse(sseBody(echoStreamFrames(['Hello', ' world'])));
      }),
    );

    const events = await collect(client.streamMessage(AGENT_URL, { text: 'ping' }));

    expect(version).toBe('1.0');
    // A traceparent is always attached, even when the caller passes none.
    expect(traceparent).toMatch(TRACEPARENT_RE);
    expect(method).toBe('message/stream');
    expect(events.map((event) => event.kind)).toEqual([
      'task',
      'status-update',
      'message',
      'message',
      'status-update',
    ]);
    const texts = events
      .filter((event) => event.kind === 'message')
      .map((event) => (event.parts[0]?.kind === 'text' ? event.parts[0].text : ''));
    expect(texts).toEqual(['Hello', ' world']);
    const last = events.at(-1);
    expect(last?.kind === 'status-update' && last.status.state).toBe('completed');
  });

  it('sends a caller-supplied traceparent verbatim so the UI trace id matches the wire', async () => {
    let traceparent: string | null = null;
    server.use(
      http.post(AGENT_URL, ({ request }) => {
        traceparent = request.headers.get('traceparent');
        return sseResponse(sseBody(echoStreamFrames(['ok'])));
      }),
    );
    const supplied = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
    await collect(client.streamMessage(AGENT_URL, { text: 'ping' }, { traceparent: supplied }));
    expect(traceparent).toBe(supplied);
  });

  it('throws the JSON-RPC error message verbatim', async () => {
    server.use(
      http.post(AGENT_URL, () => sseResponse(sseErrorBody('Agent exploded: task rejected'))),
    );
    const failure = collect(client.streamMessage(AGENT_URL, { text: 'ping' }));
    await expect(failure).rejects.toThrowError(A2AError);
    await expect(failure).rejects.toThrowError('Agent exploded: task rejected');
  });

  it('fetches the agent card from /.well-known/agent-card.json', async () => {
    server.use(
      http.get('https://api.test/a2a/external/.well-known/agent-card.json', () =>
        HttpResponse.json({ name: 'External Agent', url: 'https://api.test/a2a/external' }),
      ),
    );
    // Trailing slash on the pasted URL must not break the well-known path.
    const card = await client.fetchAgentCard('https://api.test/a2a/external/');
    expect(card.name).toBe('External Agent');
  });
});
