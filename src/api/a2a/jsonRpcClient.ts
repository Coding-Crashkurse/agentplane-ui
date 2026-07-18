import type { FetchLike } from '../../auth/authorizedFetch';
import { randomId } from '../../lib/randomId';
import { A2AError, type A2AClient, type OutgoingMessage, type SendOptions } from './client';
import { parseSse } from './sse';
import { newTraceparent } from './traceparent';
import type { AgentCard, A2AMessage, StreamEvent, Task } from './types';
import {
  messageToWire,
  streamEventFromWire,
  taskOrMessageFromWire,
  type WireMessage,
  type WireSendMessageResponse,
  type WireStreamResponse,
} from './wire';

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

function buildMessage(outgoing: OutgoingMessage): WireMessage {
  return messageToWire(outgoing.text, {
    messageId: randomId(),
    taskId: outgoing.taskId,
    contextId: outgoing.contextId,
  });
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
    message: WireMessage,
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
      'SendMessage',
      buildMessage(outgoing),
      'application/json',
      options,
    );
    if (!response.ok) throw await this.httpError(response);
    const body = (await response.json()) as JsonRpcResponse;
    const result = taskOrMessageFromWire(unwrap(body) as WireSendMessageResponse);
    if (!result) throw new A2AError('The agent returned neither a task nor a message.');
    return result;
  }

  async *streamMessage(
    agentUrl: string,
    outgoing: OutgoingMessage,
    options?: SendOptions,
  ): AsyncGenerator<StreamEvent, void, undefined> {
    const response = await this.post(
      agentUrl,
      'SendStreamingMessage',
      buildMessage(outgoing),
      'text/event-stream',
      options,
    );
    if (!response.ok) throw await this.httpError(response);
    if (!response.body) throw new A2AError('The agent returned no response body.');

    for await (const data of parseSse(response.body)) {
      const parsed = JSON.parse(data) as JsonRpcResponse;
      const event = streamEventFromWire(unwrap(parsed) as WireStreamResponse);
      if (event) yield event;
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
