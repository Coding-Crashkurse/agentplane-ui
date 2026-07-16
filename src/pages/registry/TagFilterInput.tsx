import { X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { Tag } from '../../components/Tag';

/** Chip input for the AND tag filter (SPEC §4.3): Enter adds a tag. */
export function TagFilterInput({
  tags,
  onChange,
  placeholder = 'Filter by tag…',
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  const addDraft = () => {
    const value = draft.trim();
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addDraft();
    } else if (event.key === 'Backspace' && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-control border border-border bg-card px-2 py-1 focus-within:border-accent">
      {tags.map((tag) => (
        <Tag key={tag}>
          {tag}
          <button
            aria-label={`Remove tag ${tag}`}
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="text-muted hover:text-ink"
          >
            <X aria-hidden className="size-3" />
          </button>
        </Tag>
      ))}
      <input
        aria-label="Filter by tag"
        placeholder={tags.length === 0 ? placeholder : ''}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={addDraft}
        className="h-7 min-w-24 flex-1 bg-transparent text-sm placeholder:text-muted focus:outline-none"
      />
    </div>
  );
}
