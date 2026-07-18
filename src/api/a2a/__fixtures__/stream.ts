/**
 * A2A SSE stream fixture (v1.0 JSON-RPC binding, proto-JSON wire format):
 * used by the MSW handlers to test token render order and task-state
 * transitions (CLAUDE.md testing rules). Frames mirror what a2a-sdk 1.1
 * emits: one-of StreamResponse wrappers with enum value names.
 */
import type { WireStreamResponse } from '../wire';

export function echoStreamFrames(
  reply: string[],
  taskId = 'task-1',
  contextId = 'ctx-1',
): WireStreamResponse[] {
  return [
    { task: { id: taskId, contextId, status: { state: 'TASK_STATE_SUBMITTED' } } },
    { statusUpdate: { taskId, contextId, status: { state: 'TASK_STATE_WORKING' } } },
    ...reply.map<WireStreamResponse>((text, index) => ({
      message: {
        messageId: `m-${index}`,
        taskId,
        contextId,
        role: 'ROLE_AGENT',
        parts: [{ text }],
      },
    })),
    { statusUpdate: { taskId, contextId, status: { state: 'TASK_STATE_COMPLETED' } } },
  ];
}

export function sseBody(frames: WireStreamResponse[]): string {
  return frames
    .map((frame) => `data: ${JSON.stringify({ jsonrpc: '2.0', id: 1, result: frame })}\n\n`)
    .join('');
}

export function sseErrorBody(message: string, code = -32000): string {
  return `data: ${JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code, message } })}\n\n`;
}
