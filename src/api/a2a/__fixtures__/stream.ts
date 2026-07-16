/**
 * A2A SSE stream fixture (v1.0 JSON-RPC binding): used by the MSW handlers
 * to test token render order and task-state transitions (CLAUDE.md testing rules).
 */
import type { StreamEvent } from '../types';

export function echoStreamFrames(
  reply: string[],
  taskId = 'task-1',
  contextId = 'ctx-1',
): StreamEvent[] {
  return [
    { kind: 'task', id: taskId, contextId, status: { state: 'submitted' } },
    { kind: 'status-update', taskId, contextId, status: { state: 'working' }, final: false },
    ...reply.map<StreamEvent>((text, index) => ({
      kind: 'message',
      role: 'agent',
      parts: [{ kind: 'text', text }],
      messageId: `m-${index}`,
      taskId,
      contextId,
    })),
    { kind: 'status-update', taskId, contextId, status: { state: 'completed' }, final: true },
  ];
}

export function sseBody(frames: StreamEvent[]): string {
  return frames
    .map((frame) => `data: ${JSON.stringify({ jsonrpc: '2.0', id: 1, result: frame })}\n\n`)
    .join('');
}

export function sseErrorBody(message: string, code = -32000): string {
  return `data: ${JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code, message } })}\n\n`;
}
