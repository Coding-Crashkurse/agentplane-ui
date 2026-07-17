import type { FetchLike } from '../../auth/authorizedFetch';
import { randomId } from '../../lib/randomId';
import { A2AError, type A2AClient, type OutgoingMessage, type SendOptions } from './client';
import { parseSse } from './sse';
import { newTraceparent } from './traceparent';
import type { AgentCard, A2AMessage, StreamEvent, Task } from './types';

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

const A2A_VERSION = '1.0';

function buildMessage(outgoing: OutgoingMessage): A2AMessage {
  return {
    kind: 'message',
    role: 'user',
    parts: [{ kind: 'text', text: outgoing.text }],
    messageId: randomId(),
    taskId: outgoing.taskId,
    contextId: outgoing.contextId,
  };
}

function unwrap(response: JsonRpcResponse): unknown {
  if (response.error) {
    throw new A2AError(response.error.message, response.error.code);
  }
  return response.result;
}

/**
 * Internal A2A v1.0 client: JSON-RPC over HTTP POST, streaming via SSE
 * (SPEC §2 "A2A client"). Talks only to the gateway URLs stored in the registry.
 */
export class JsonRpcA2AClient implements A2AClient {
  constructor(private fetchFn: FetchLike) {}

  async fetchAgentCard(agentUrl: string): Promise<AgentCard> {
    const url = `${agentUrl.replace(/\/+$/, '')}/.well-known/agent-card.json`;
    const response = await this.fetchFn(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new A2AError(`Agent card could not be fetched (HTTP ${response.status}).`);
    }
    return (await response.json()) as AgentCard;
  }

  private async post(
    agentUrl: string,
    method: string,
    message: A2AMessage,
    accept: string,
    options?: SendOptions,
  ): Promise<Response> {
    // Every A2A request carries a W3C traceparent (SPEC §12); the caller may
    // pass its own to keep the trace id, otherwise one is generated here.
    const traceparent = options?.traceparent ?? newTraceparent().header;
    return this.fetchFn(agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: accept,
        'A2A-Version': A2A_VERSION,
        traceparent,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: randomId(),
        method,
        params: { message },
      }),
      signal: options?.signal,
    });
  }

  async sendMessage(
    agentUrl: string,
    outgoing: OutgoingMessage,
    options?: SendOptions,
  ): Promise<Task | A2AMessage> {
    const response = await this.post(
      agentUrl,
      'message/send',
      buildMessage(outgoing),
      'application/json',
      options,
    );
    if (!response.ok) throw await this.httpError(response);
    const body = (await response.json()) as JsonRpcResponse;
    return unwrap(body) as Task | A2AMessage;
  }

  async *streamMessage(
    agentUrl: string,
    outgoing: OutgoingMessage,
    options?: SendOptions,
  ): AsyncGenerator<StreamEvent, void, undefined> {
    const response = await this.post(
      agentUrl,
      'message/stream',
      buildMessage(outgoing),
      'text/event-stream',
      options,
    );
    if (!response.ok) throw await this.httpError(response);
    if (!response.body) throw new A2AError('The agent returned no response body.');

    for await (const data of parseSse(response.body)) {
      const parsed = JSON.parse(data) as JsonRpcResponse;
      yield unwrap(parsed) as StreamEvent;
    }
  }

  private async httpError(response: Response): Promise<A2AError> {
    try {
      const body = (await response.json()) as JsonRpcResponse;
      if (body.error) return new A2AError(body.error.message, body.error.code);
    } catch {
      /* not JSON-RPC: fall through to HTTP status */
    }
    return new A2AError(`A2A request failed (HTTP ${response.status}).`);
  }
}
