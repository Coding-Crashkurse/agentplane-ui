import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { JsonRpcA2AClient, type AgentCard } from '../../api/a2a';
import { useRegistryClient } from '../../api/registry/hooks';
import { entryName } from '../../api/registry/types';
import { useAuthorizedFetch } from '../../auth';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Drawer } from '../../components/Drawer';
import { ErrorNotice } from '../../components/ErrorNotice';
import { Input } from '../../components/Input';
import { Tag } from '../../components/Tag';
import { useToast } from '../../components/Toast';
import { useConfig } from '../../config';

/**
 * Register-external flow (SPEC §4.3): paste gateway URL → preview the agent
 * card from /.well-known/agent-card.json → POST /agents. API validation
 * errors (e.g. private-URL rejection) are shown inline.
 */
export function RegisterExternalDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const config = useConfig();
  const fetchFn = useAuthorizedFetch();
  const a2aClient = useMemo(() => new JsonRpcA2AClient(fetchFn), [fetchFn]);
  const registry = useRegistryClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [url, setUrl] = useState('');
  const [card, setCard] = useState<AgentCard | null>(null);

  const close = () => {
    setUrl('');
    setCard(null);
    fetchCard.reset();
    register.reset();
    onClose();
  };

  const fetchCard = useMutation({
    mutationFn: () => a2aClient.fetchAgentCard(url.trim()),
    onSuccess: setCard,
  });

  const register = useMutation({
    mutationFn: () =>
      registry.register(url.trim(), card as unknown as Record<string, unknown>),
    onSuccess: (entry) => {
      toast('success', `"${entryName(entry)}" was registered.`);
      void queryClient.invalidateQueries({ queryKey: ['entries'] });
      close();
    },
  });

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Register external agent"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button disabled={!card || register.isPending} onClick={() => register.mutate()}>
            {register.isPending ? 'Registering…' : 'Register agent'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Paste the agent&apos;s public gateway URL. The agent card is fetched from{' '}
          <code className="text-xs">/.well-known/agent-card.json</code> for preview before
          registering.
        </p>
        <Input
          label="Agent gateway URL"
          placeholder={`${config.a2aBaseUrl}/a2a/my-agent`}
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setCard(null);
          }}
        />
        <div>
          <Button
            variant="secondary"
            disabled={!url.trim() || fetchCard.isPending}
            onClick={() => fetchCard.mutate()}
          >
            {fetchCard.isPending ? 'Fetching card…' : 'Fetch card'}
          </Button>
        </div>

        {fetchCard.isError && (
          <ErrorNotice
            title="Agent card could not be fetched"
            detail={fetchCard.error instanceof Error ? fetchCard.error.message : undefined}
          />
        )}

        {card && (
          <Card data-testid="card-preview" className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-ink">{card.name}</h3>
            {card.description && <p className="text-sm text-muted">{card.description}</p>}
            <code className="break-all text-xs text-muted">{card.url}</code>
            {card.skills && card.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {card.skills.map((skill) => (
                  <Tag key={skill.id}>{skill.name}</Tag>
                ))}
              </div>
            )}
          </Card>
        )}

        {register.isError && (
          <ErrorNotice
            title="Registration was rejected"
            detail={register.error instanceof Error ? register.error.message : undefined}
          />
        )}
      </div>
    </Drawer>
  );
}
