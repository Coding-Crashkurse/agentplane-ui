import type { AgentCard, A2AMessage, StreamEvent, Task } from './types';

export interface OutgoingMessage {
  text: string;
  taskId?: string;
  contextId?: string;
}

export class A2AError extends Error {
  constructor(
    message: string,
    public code?: number,
  ) {
    super(message);
  }
}

/**
 * Swappable A2A client interface (SPEC §7): all A2A access goes through
 * this so the implementation (SDK vs. internal JSON-RPC) can change freely.
 */
export interface A2AClient {
  fetchAgentCard(agentUrl: string): Promise<AgentCard>;
  sendMessage(agentUrl: string, message: OutgoingMessage): Promise<Task | A2AMessage>;
  streamMessage(
    agentUrl: string,
    message: OutgoingMessage,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamEvent, void, undefined>;
}
