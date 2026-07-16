import { useState } from 'react';
import type { RegistryEntry } from '../../api/registry/types';
import { AgentPicker } from './AgentPicker';
import { Conversation } from './Conversation';
import { useChat } from './useChat';

/** Chat playground: A2A streaming through the gateway (SPEC §4.2). */
export function ChatPage() {
  const [selected, setSelected] = useState<RegistryEntry | null>(null);
  const { messages, isStreaming, send } = useChat(selected);

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-6xl">
      <aside className="w-80 shrink-0 border-r border-border" aria-label="Agent picker">
        <AgentPicker selected={selected} onSelect={setSelected} />
      </aside>
      <section className="min-w-0 flex-1" aria-label="Conversation">
        <Conversation
          agent={selected}
          messages={messages}
          isStreaming={isStreaming}
          onSend={(text) => void send(text)}
        />
      </section>
    </div>
  );
}
