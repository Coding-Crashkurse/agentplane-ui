import { ArrowUpRight, Boxes, MessageSquare, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useRoles, useUsername } from '../../auth';
import { useConfig, type LaunchpadLink } from '../../config';
import { tileIcon } from './icons';
import { StatsStrip } from './StatsStrip';

function TileCard({
  icon: Icon,
  name,
  description,
  external,
}: {
  icon: LucideIcon;
  name: string;
  description: string;
  external?: boolean;
}) {
  return (
    <span className="flex h-full flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-md">
      <span className="flex size-10 items-center justify-center rounded-control bg-accent-soft">
        <Icon aria-hidden className="size-5 text-accent" />
      </span>
      <span className="flex items-center gap-1 text-base font-semibold text-ink">
        {name}
        {external && <ArrowUpRight aria-hidden className="size-4 text-muted" />}
      </span>
      <span className="text-sm leading-relaxed text-muted">{description}</span>
    </span>
  );
}

function Tile({ link }: { link: LaunchpadLink }) {
  return (
    // External modules (builder, traces, admin console) open in a new tab so
    // the launchpad stays available as the hub — there is otherwise no way back
    // from a separate app. The SSO session is browser-wide, so it is shared
    // across tabs regardless (SPEC §4.1).
    <a href={link.url} target="_blank" rel="noopener noreferrer" className="block">
      <TileCard
        icon={tileIcon(link.icon)}
        name={link.name}
        description={link.description}
        external
      />
    </a>
  );
}

function InternalTile({
  to,
  icon,
  name,
  description,
}: {
  to: string;
  icon: LucideIcon;
  name: string;
  description: string;
}) {
  return (
    <Link to={to} className="block">
      <TileCard icon={icon} name={name} description={description} />
    </Link>
  );
}

export function LaunchpadPage(): ReactNode {
  const config = useConfig();
  const roles = useRoles();
  const username = useUsername();

  const visibleLinks = config.links.filter(
    (link) =>
      !link.roles || link.roles.length === 0 || link.roles.some((role) => roles.includes(role)),
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Welcome{username ? `, ${username}` : ''}
        </h1>
        <p className="mt-1 text-muted">Everything on your agent platform, one login away.</p>
      </div>

      <StatsStrip />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InternalTile
          to="/chat"
          icon={MessageSquare}
          name="Chat"
          description="Talk to any registered agent via A2A streaming."
        />
        <InternalTile
          to="/registry"
          icon={Boxes}
          name="Registry"
          description="Search, inspect and manage registered agents and MCP servers."
        />
        {visibleLinks.map((link) => (
          <Tile key={link.id} link={link} />
        ))}
      </div>
    </div>
  );
}
