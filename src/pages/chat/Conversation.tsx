import { ExternalLink, MessageSquare, SendHorizonal } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FINAL_TASK_STATES } from '../../api/a2a';
import { useIsAdmin } from '../../auth';
import type { RegistryEntry } from '../../api/registry/types';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { StatusBadge } from '../../components/StatusBadge';
import { useConfig, type AppConfig } from '../../config';
import { cn } from '../../lib/cn';
import { resolveTraceLink } from './traceLink';
import type { ChatMessage } from './useChat';

function TaskStateChip({ message }: { message: ChatMessage }) {
  if (!message.taskState) return null;
  const finished = FINAL_TASK_STATES.has(message.taskState);
  return (
    <span
      data-testid="task-state"
      className={cn(
        'text-xs',
        message.taskState === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-muted',
        !finished && 'animate-pulse',
      )}
    >
      {message.taskState}
    </span>
  );
}

function MessageBubble({
  message,
  config,
  showTrace,
}: {
  message: ChatMessage;
  config: AppConfig;
  showTrace: boolean;
}) {
  const isUser = message.role === 'user';
  // Show a trace link once the response has finished streaming (completed or
  // failed): traces are as useful on failure. The link lands on the exact trace
  // only if the gateway/runtime propagated our traceparent (SPEC §12). Traces
  // live in the tracing backend, which is admin-only (project-scoped, not
  // per-user); non-admins never get the link.
  const traceLink =
    showTrace && !isUser && !message.streaming ? resolveTraceLink(config, message.traceId) : null;
  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div
        data-role={`${message.role}-message`}
        className={cn(
          'max-w-[75%] whitespace-pre-wrap rounded-card px-4 py-2.5 text-sm leading-relaxed',
          isUser ? 'bg-accent-bright text-slate-950' : 'border border-border bg-surface text-ink',
        )}
      >
        {message.text}
        {message.streaming && (
          <span aria-hidden className="ml-0.5 animate-pulse">
            ▍
          </span>
        )}
      </div>
      {!isUser && (
        <div className="flex items-center gap-3 px-1">
          <TaskStateChip message={message} />
          {traceLink && (
            <a
              href={traceLink.href}
              target="_blank"
              rel="noreferrer"
              title={
                traceLink.exact
                  ? 'Opens this response in the tracing UI when the trace id was propagated end to end, otherwise the tracing home.'
                  : 'Opens the tracing UI.'
              }
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Trace
              <ExternalLink aria-hidden className="size-3" />
            </a>
          )}
        </div>
      )}
      {message.error && (
        <div
          role="alert"
          className="max-w-[75%] rounded-card border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
        >
          {message.error}
        </div>
      )}
    </div>
  );
}

export function Conversation({
  agent,
  messages,
  isStreaming,
  onSend,
}: {
  agent: RegistryEntry | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  onSend: (text: string) => void;
}) {
  const config = useConfig();
  const isAdmin = useIsAdmin();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (!agent) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Pick an agent to start chatting"
        description="Select any registered agent from the list: the conversation streams live via A2A."
      />
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || isStreaming) return;
    onSend(draft);
    setDraft('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <h2 className="text-base font-semibold text-ink">{agent.name}</h2>
        <StatusBadge status={agent.status} lastSeen={agent.last_seen} />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No messages yet"
            description={`Say something to ${agent.name}: replies stream in live.`}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                config={config}
                showTrace={isAdmin}
              />
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border px-5 py-3">
        <input
          aria-label="Message"
          placeholder={`Message ${agent.name}…`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="h-10 flex-1 rounded-control border border-border bg-card px-3 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <Button type="submit" disabled={isStreaming || !draft.trim()} aria-label="Send">
          <SendHorizonal aria-hidden className="size-4" />
          Send
        </Button>
      </form>
    </div>
  );
}
