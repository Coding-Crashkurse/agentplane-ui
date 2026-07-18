import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRegistryClient } from '../../api/registry/hooks';
import {
  entryDescription,
  entryName,
  type RegistryEntry,
} from '../../api/registry/types';
import { useIsAdmin, useSubject } from '../../auth';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Drawer } from '../../components/Drawer';
import { ErrorNotice } from '../../components/ErrorNotice';
import { StatusBadge } from '../../components/StatusBadge';
import { Tag } from '../../components/Tag';
import { useToast } from '../../components/Toast';
import { TagFilterInput } from './TagFilterInput';

interface CardSkill {
  id?: string;
  name?: string;
  description?: string;
}

function skillsOf(card: Record<string, unknown>): CardSkill[] {
  const skills = card['skills'];
  if (!Array.isArray(skills)) return [];
  return skills.filter((skill): skill is CardSkill => typeof skill === 'object' && skill !== null);
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</h3>
      {children}
    </div>
  );
}

/** Detail drawer: rendered card, raw JSON, tag editing and delete (SPEC §4.3). */
export function EntryDrawer({
  entry,
  onClose,
}: {
  entry: RegistryEntry | null;
  onClose: () => void;
}) {
  const client = useRegistryClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isAdmin = useIsAdmin();
  const subject = useSubject();
  const [tags, setTags] = useState<string[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setTags(entry?.tags ?? []);
    setConfirmingDelete(false);
  }, [entry]);

  const canEdit = entry !== null && (isAdmin || entry.owner === subject);
  const tagsChanged =
    entry !== null &&
    (tags.length !== entry.tags.length || tags.some((tag) => !entry.tags.includes(tag)));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['entries'] });

  const saveTags = useMutation({
    mutationFn: () => client.updateTags(entry!.id, tags),
    onSuccess: () => {
      toast('success', 'Tags updated.');
      void invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: () => client.remove(entry!.id),
    onSuccess: () => {
      toast('success', `"${entryName(entry!)}" was deleted.`);
      void invalidate();
      onClose();
    },
  });

  const toggleEnabled = useMutation({
    mutationFn: () => client.setEnabled(entry!.id, !entry!.enabled),
    onSuccess: (updated) => {
      toast('success', updated.enabled ? 'Entry enabled.' : 'Entry disabled.');
      void invalidate();
      onClose();
    },
  });

  const copyCard = async () => {
    if (!entry) return;
    await navigator.clipboard.writeText(JSON.stringify(entry.card, null, 2));
    toast('info', 'Card JSON copied to clipboard.');
  };

  if (!entry) return null;

  const skills = skillsOf(entry.card);

  return (
    <Drawer open onClose={onClose} title={entryName(entry)}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="blue">{entry.kind === 'mcp_server' ? 'MCP server' : 'agent'}</Badge>
          {entry.enabled ? (
            <StatusBadge status={entry.status} lastSeen={entry.last_seen} />
          ) : (
            <Badge tone="slate">disabled</Badge>
          )}
        </div>

        <p className="text-sm leading-relaxed text-muted">{entryDescription(entry)}</p>

        <Section label="URL">
          <code className="break-all rounded-control bg-surface px-2 py-1 text-xs text-ink">
            {entry.url}
          </code>
        </Section>

        <Section label="Owner">
          <p data-testid="entry-owner" className="text-sm text-ink">
            {entry.owner}
          </p>
        </Section>

        {skills.length > 0 && (
          <Section label="Skills">
            <ul className="flex flex-col gap-2">
              {skills.map((skill, index) => (
                <li
                  key={skill.id ?? index}
                  className="rounded-control border border-border px-3 py-2"
                >
                  <p className="text-sm font-medium text-ink">{skill.name ?? skill.id}</p>
                  {skill.description && <p className="text-xs text-muted">{skill.description}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section label="Tags">
          {canEdit ? (
            <div className="flex flex-col gap-2">
              <TagFilterInput tags={tags} onChange={setTags} placeholder="Add a tag…" />
              {saveTags.isError && (
                <ErrorNotice
                  title="Tags could not be saved"
                  detail={saveTags.error instanceof Error ? saveTags.error.message : undefined}
                />
              )}
              {tagsChanged && (
                <div>
                  <Button size="sm" disabled={saveTags.isPending} onClick={() => saveTags.mutate()}>
                    {saveTags.isPending ? 'Saving…' : 'Save tags'}
                  </Button>
                </div>
              )}
            </div>
          ) : entry.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No tags.</p>
          )}
        </Section>

        <Section label="Raw card">
          <div className="relative">
            <pre className="max-h-72 overflow-auto rounded-card border border-border bg-surface p-3 text-xs leading-relaxed text-ink">
              {JSON.stringify(entry.card, null, 2)}
            </pre>
            <Button
              variant="secondary"
              size="sm"
              aria-label="Copy card JSON"
              className="absolute right-2 top-2"
              onClick={() => void copyCard()}
            >
              <Copy aria-hidden className="size-3.5" />
              Copy
            </Button>
          </div>
        </Section>

        {canEdit && (
          <Section label="Availability">
            <div className="flex items-center gap-3">
              <p className="flex-1 text-sm text-muted">
                {entry.enabled
                  ? 'Disabling hides the entry from discovery and pauses health checks; it stays listed here.'
                  : 'This entry is disabled: hidden from discovery, not health-checked.'}
              </p>
              <Button
                variant="secondary"
                size="sm"
                disabled={toggleEnabled.isPending}
                onClick={() => toggleEnabled.mutate()}
              >
                {toggleEnabled.isPending
                  ? 'Saving…'
                  : entry.enabled
                    ? 'Disable entry'
                    : 'Enable entry'}
              </Button>
            </div>
            {toggleEnabled.isError && (
              <ErrorNotice
                title="Change failed"
                detail={
                  toggleEnabled.error instanceof Error ? toggleEnabled.error.message : undefined
                }
              />
            )}
          </Section>
        )}

        {canEdit && (
          <Section label="Danger zone">
            {remove.isError && (
              <ErrorNotice
                title="Delete failed"
                detail={remove.error instanceof Error ? remove.error.message : undefined}
              />
            )}
            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-sm text-ink">
                  Delete “{entryName(entry)}”? This cannot be undone.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  {remove.isPending ? 'Deleting…' : 'Confirm delete'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div>
                <Button variant="danger" size="sm" onClick={() => setConfirmingDelete(true)}>
                  Delete entry
                </Button>
              </div>
            )}
          </Section>
        )}
      </div>
    </Drawer>
  );
}
