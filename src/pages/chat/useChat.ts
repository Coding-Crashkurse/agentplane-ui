import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  JsonRpcA2AClient,
  newTraceparent,
  textFromParts,
  type Task,
  type TaskState,
} from '../../api/a2a';
import type { RegistryEntry } from '../../api/registry/types';
import { useAuthorizedFetch } from '../../auth';
import { randomId } from '../../lib/randomId';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  taskState?: TaskState;
  /** A2A error message, shown verbatim (SPEC §4.2). */
  error?: string;
  /** W3C trace id sent with this exchange, used to build a trace deep link (SPEC §12). */
  traceId?: string;
  streaming: boolean;
}

/** Restored view of one persisted task: the user turn(s) and the reply. */
function taskToMessages(task: Task): ChatMessage[] {
  const restored: ChatMessage[] = [];
  for (const message of task.history ?? []) {
    if (message.role === 'user') {
      restored.push({
        id: message.messageId || randomId(),
        role: 'user',
        text: textFromParts(message.parts),
        streaming: false,
      });
    }
  }
  const failed = task.status.state === 'failed';
  restored.push({
    id: `restored-${task.id}`,
    role: 'agent',
    text: (task.artifacts ?? []).map((artifact) => textFromParts(artifact.parts)).join(''),
    taskState: task.status.state,
    error: failed ? textFromParts(task.status.message?.parts) || 'Task failed.' : undefined,
    streaming: false,
  });
  return restored;
}

/**
 * Conversation state (SPEC §4.2). Streams via A2A to the entry's stored
 * gateway URL. When the runtime persists tasks (TASK_STORE=database), the
 * history is restored via A2A `ListTasks` on agent selection — best-effort:
 * agents without task persistence simply start empty.
 */
export function useChat(agent: RegistryEntry | null) {
  const fetchFn = useAuthorizedFetch();
  const client = useMemo(() => new JsonRpcA2AClient(fetchFn), [fetchFn]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const contextIdRef = useRef<string | undefined>(undefined);
  // Keyed on the stable URL, not the entry object: registry refetches create
  // new objects for the same agent and must not wipe a running conversation.
  const agentUrl = agent?.url;

  useEffect(() => {
    setMessages([]);
    contextIdRef.current = undefined;
    if (!agentUrl) return;
    let cancelled = false;
    void (async () => {
      try {
        const tasks = await client.listTasks(agentUrl);
        if (cancelled || tasks.length === 0) return;
        const ordered = [...tasks].reverse(); // server lists newest first
        contextIdRef.current = ordered.at(-1)?.contextId;
        setMessages(ordered.flatMap(taskToMessages));
      } catch {
        /* restore is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentUrl, client]);

  const send = useCallback(
    async (text: string) => {
      if (!agent || isStreaming || !text.trim()) return;
      const agentMessageId = randomId();
      // Generate the traceparent up front so the assistant message keeps its
      // trace id for the deep link, and the same id is sent on the wire.
      const { header: traceparent, traceId } = newTraceparent();
      setMessages((current) => [
        ...current,
        { id: randomId(), role: 'user', text, streaming: false },
        { id: agentMessageId, role: 'agent', text: '', traceId, streaming: true },
      ]);
      setIsStreaming(true);

      const patch = (updater: (message: ChatMessage) => ChatMessage) =>
        setMessages((current) =>
          current.map((message) => (message.id === agentMessageId ? updater(message) : message)),
        );

      try {
        const stream = client.streamMessage(
          agent.url,
          { text, contextId: contextIdRef.current },
          { traceparent },
        );
        for await (const event of stream) {
          switch (event.kind) {
            case 'task':
              contextIdRef.current = event.contextId;
              patch((m) => ({
                ...m,
                taskState: event.status.state,
                text: m.text + textFromParts(event.status.message?.parts),
              }));
              break;
            case 'status-update':
              patch((m) => ({
                ...m,
                taskState: event.status.state,
                text: m.text + textFromParts(event.status.message?.parts),
                error:
                  event.status.state === 'failed'
                    ? textFromParts(event.status.message?.parts) || 'Task failed.'
                    : m.error,
              }));
              break;
            case 'message':
              if (event.contextId) contextIdRef.current = event.contextId;
              patch((m) => ({ ...m, text: m.text + textFromParts(event.parts) }));
              break;
            case 'artifact-update':
              patch((m) => ({ ...m, text: m.text + textFromParts(event.artifact.parts) }));
              break;
          }
        }
        patch((m) => ({ ...m, streaming: false }));
      } catch (error) {
        patch((m) => ({
          ...m,
          streaming: false,
          taskState: 'failed',
          error: error instanceof Error ? error.message : String(error),
        }));
      } finally {
        setIsStreaming(false);
      }
    },
    [agent, client, isStreaming],
  );

  return { messages, isStreaming, send };
}
