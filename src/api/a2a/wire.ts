/**
 * A2A v1.0 proto-JSON wire mapping (CLAUDE.md invariant 4).
 *
 * On the wire, A2A v1.0 uses the protobuf JSON encoding: gRPC-style method
 * names (`SendMessage`, `SendStreamingMessage`), enum value names
 * (`ROLE_USER`, `TASK_STATE_COMPLETED`), flat parts (`{text: "..."}`, no
 * `kind` discriminator) and one-of wrapper objects for stream responses.
 * The app keeps working with the friendlier internal model in `types.ts`;
 * this module is the only place that knows both shapes.
 */
import {
  FINAL_TASK_STATES,
  type A2AMessage,
  type Artifact,
  type Part,
  type StreamEvent,
  type Task,
  type TaskState,
  type TaskStatus,
} from './types';

export interface WirePart {
  text?: string;
  raw?: string;
  url?: string;
  data?: unknown;
  filename?: string;
  mediaType?: string;
  metadata?: Record<string, unknown>;
}

export interface WireMessage {
  messageId?: string;
  contextId?: string;
  taskId?: string;
  role?: string;
  parts?: WirePart[];
}

export interface WireTaskStatus {
  state?: string;
  message?: WireMessage;
  timestamp?: string;
}

export interface WireArtifact {
  artifactId?: string;
  name?: string;
  description?: string;
  parts?: WirePart[];
}

export interface WireTask {
  id?: string;
  contextId?: string;
  status?: WireTaskStatus;
  artifacts?: WireArtifact[];
  history?: WireMessage[];
}

/** One-of: exactly one field is set per stream frame. */
export interface WireStreamResponse {
  task?: WireTask;
  message?: WireMessage;
  statusUpdate?: { taskId?: string; contextId?: string; status?: WireTaskStatus };
  artifactUpdate?: { taskId?: string; contextId?: string; artifact?: WireArtifact };
}

export interface WireSendMessageResponse {
  task?: WireTask;
  message?: WireMessage;
}

const STATE_FROM_WIRE: Record<string, TaskState> = {
  TASK_STATE_SUBMITTED: 'submitted',
  TASK_STATE_WORKING: 'working',
  TASK_STATE_COMPLETED: 'completed',
  TASK_STATE_FAILED: 'failed',
  TASK_STATE_CANCELED: 'canceled',
  TASK_STATE_INPUT_REQUIRED: 'input-required',
  TASK_STATE_REJECTED: 'rejected',
  TASK_STATE_AUTH_REQUIRED: 'auth-required',
};

export function messageToWire(
  text: string,
  ids: { messageId: string; taskId?: string; contextId?: string },
): WireMessage {
  return {
    messageId: ids.messageId,
    ...(ids.taskId ? { taskId: ids.taskId } : {}),
    ...(ids.contextId ? { contextId: ids.contextId } : {}),
    role: 'ROLE_USER',
    parts: [{ text }],
  };
}

function partFromWire(part: WirePart): Part | null {
  if (typeof part.text === 'string') return { kind: 'text', text: part.text };
  if (part.data !== undefined) return { kind: 'data', data: part.data as Record<string, unknown> };
  if (part.url !== undefined || part.raw !== undefined) {
    return {
      kind: 'file',
      file: { uri: part.url, bytes: part.raw, mimeType: part.mediaType, name: part.filename },
    };
  }
  return null;
}

function partsFromWire(parts: WirePart[] | undefined): Part[] {
  return (parts ?? []).map(partFromWire).filter((part): part is Part => part !== null);
}

function messageFromWire(message: WireMessage): A2AMessage {
  return {
    kind: 'message',
    role: message.role === 'ROLE_USER' ? 'user' : 'agent',
    parts: partsFromWire(message.parts),
    messageId: message.messageId ?? '',
    taskId: message.taskId,
    contextId: message.contextId,
  };
}

function statusFromWire(status: WireTaskStatus | undefined): TaskStatus {
  return {
    state: STATE_FROM_WIRE[status?.state ?? ''] ?? 'unknown',
    message: status?.message ? messageFromWire(status.message) : undefined,
    timestamp: status?.timestamp,
  };
}

function artifactFromWire(artifact: WireArtifact | undefined): Artifact {
  return {
    artifactId: artifact?.artifactId ?? '',
    name: artifact?.name,
    description: artifact?.description,
    parts: partsFromWire(artifact?.parts),
  };
}

function taskFromWire(task: WireTask): Task {
  return {
    kind: 'task',
    id: task.id ?? '',
    contextId: task.contextId ?? '',
    status: statusFromWire(task.status),
    artifacts: task.artifacts?.map((artifact) => artifactFromWire(artifact)),
    history: task.history?.map(messageFromWire),
  };
}

export function streamEventFromWire(result: WireStreamResponse): StreamEvent | null {
  if (result.task) return taskFromWire(result.task);
  if (result.message) return messageFromWire(result.message);
  if (result.statusUpdate) {
    const status = statusFromWire(result.statusUpdate.status);
    return {
      kind: 'status-update',
      taskId: result.statusUpdate.taskId ?? '',
      contextId: result.statusUpdate.contextId ?? '',
      status,
      final: FINAL_TASK_STATES.has(status.state),
    };
  }
  if (result.artifactUpdate) {
    return {
      kind: 'artifact-update',
      taskId: result.artifactUpdate.taskId ?? '',
      contextId: result.artifactUpdate.contextId ?? '',
      artifact: artifactFromWire(result.artifactUpdate.artifact),
    };
  }
  return null;
}

export function taskOrMessageFromWire(result: WireSendMessageResponse): Task | A2AMessage | null {
  if (result.task) return taskFromWire(result.task);
  if (result.message) return messageFromWire(result.message);
  return null;
}
