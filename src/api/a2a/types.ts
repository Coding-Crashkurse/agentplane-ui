/** A2A v1.0 wire types (JSON-RPC binding): protocol fidelity per CLAUDE.md invariant 4. */

export type TaskState =
  | 'submitted'
  | 'working'
  | 'input-required'
  | 'auth-required'
  | 'completed'
  | 'canceled'
  | 'failed'
  | 'rejected'
  | 'unknown';

export interface TextPart {
  kind: 'text';
  text: string;
  metadata?: Record<string, unknown>;
}

export interface FilePart {
  kind: 'file';
  file: { name?: string; mimeType?: string; bytes?: string; uri?: string };
  metadata?: Record<string, unknown>;
}

export interface DataPart {
  kind: 'data';
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type Part = TextPart | FilePart | DataPart;

export interface A2AMessage {
  kind: 'message';
  role: 'user' | 'agent';
  parts: Part[];
  messageId: string;
  taskId?: string;
  contextId?: string;
}

export interface TaskStatus {
  state: TaskState;
  message?: A2AMessage;
  timestamp?: string;
}

export interface Artifact {
  artifactId: string;
  name?: string;
  description?: string;
  parts: Part[];
}

export interface Task {
  kind: 'task';
  id: string;
  contextId: string;
  status: TaskStatus;
  artifacts?: Artifact[];
  history?: A2AMessage[];
}

export interface TaskStatusUpdateEvent {
  kind: 'status-update';
  taskId: string;
  contextId: string;
  status: TaskStatus;
  final: boolean;
}

export interface TaskArtifactUpdateEvent {
  kind: 'artifact-update';
  taskId: string;
  contextId: string;
  artifact: Artifact;
  append?: boolean;
  lastChunk?: boolean;
}

export type StreamEvent = Task | A2AMessage | TaskStatusUpdateEvent | TaskArtifactUpdateEvent;

export interface AgentSkill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  examples?: string[];
}

export interface AgentCard {
  protocolVersion?: string;
  name: string;
  description?: string;
  url: string;
  version?: string;
  capabilities?: { streaming?: boolean; pushNotifications?: boolean };
  skills?: AgentSkill[];
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
}

export const FINAL_TASK_STATES: ReadonlySet<TaskState> = new Set([
  'completed',
  'canceled',
  'failed',
  'rejected',
]);

export function textFromParts(parts: Part[] | undefined): string {
  if (!parts) return '';
  return parts
    .filter((part): part is TextPart => part.kind === 'text')
    .map((part) => part.text)
    .join('');
}
