import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { useRegistryClient } from '../../api/registry/hooks';
import { AgentPicker } from './AgentPicker';
import { Conversation } from './Conversation';
import { useChat } from './useChat';

/**
 * Chat playground: A2A streaming through the gateway (SPEC §4.2).
 *
 * The selected agent lives in the URL (`/chat/:agentId`), not in component
 * state: it survives full reloads and the OIDC redirect round-trip (a 401
 * mid-session redirects through Keycloak and back), and chats are deep
 * linkable. The route stays behind RequireAuth; entry visibility is enforced
 * by the registry API, an invisible id simply renders no selection.
 */
export function ChatPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const client = useRegistryClient();

  const { data } = useQuery({
    queryKey: ['entry', agentId],
    queryFn: () => client.get(agentId!),
    enabled: agentId !== undefined,
  });
  const selected = data ?? null;
  const { messages, isStreaming, send } = useChat(selected);

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-6xl">
      <aside className="w-80 shrink-0 border-r border-border" aria-label="Agent picker">
        <AgentPicker
          selected={selected}
          onSelect={(entry) => void navigate(`/chat/${entry.id}`)}
        />
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
