import { Boxes, LogIn, MessageSquare, Workflow, type LucideIcon } from 'lucide-react';

const FEATURES: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: Workflow,
    title: 'Build agents',
    text: 'Create agent flows in the visual builder and ship them straight to the platform.',
  },
  {
    icon: Boxes,
    title: 'A living registry',
    text: 'Every agent and MCP server lives in a central registry: discoverable, health-checked and ready to use.',
  },
  {
    icon: MessageSquare,
    title: 'Chat playground',
    text: 'Talk to any registered agent. Replies stream in live over the A2A protocol, straight through the gateway.',
  },
];

const FACTS = [
  { value: 'A2A 1.0', label: 'Agent protocol' },
  { value: 'OIDC', label: 'Single sign-on' },
  { value: 'MIT', label: 'Open source' },
];

/** Public landing, always visible without a session; login starts only on click. */
export function LandingPage({ onSignIn, error }: { onSignIn: () => void; error?: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-xl font-bold tracking-tight">
            agent<span className="text-cyan-400">plane</span>
          </span>
          <button
            onClick={onSignIn}
            className="inline-flex h-10 items-center gap-2 rounded-control bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300 focus-visible:outline-cyan-300"
          >
            <LogIn aria-hidden className="size-4" />
            Log in
          </button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:pt-28">
          <span className="inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-300">
            Agent platform
          </span>
          <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Build agents that live in a registry.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            agentplane is the home for your agents: build them, register them, run them. Search the
            central registry, inspect every agent card, and talk to any agent over live A2A
            streaming. One login for the whole platform.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-8 max-w-md rounded-card border border-red-500/40 bg-red-500/10 px-4 py-3"
            >
              <p className="text-sm font-semibold text-red-300">Sign-in failed</p>
              <p className="mt-0.5 text-sm break-words text-red-300/80">{error}</p>
            </div>
          )}

          <div className="mt-12 grid max-w-md grid-cols-3 gap-3">
            {FACTS.map((fact) => (
              <div
                key={fact.value}
                className="rounded-card border border-slate-800 bg-slate-900/60 px-4 py-4 text-center"
              >
                <p className="text-lg font-bold">{fact.value}</p>
                <p className="mt-0.5 text-xs text-slate-400">{fact.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex flex-col gap-3 rounded-card border border-slate-800 bg-slate-900/60 p-6"
              >
                <span className="flex size-10 items-center justify-center rounded-control bg-cyan-400/10">
                  <Icon aria-hidden className="size-5 text-cyan-400" />
                </span>
                <h2 className="text-base font-semibold">{title}</h2>
                <p className="text-sm leading-relaxed text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 text-sm text-slate-500">
          agentplane, an open platform for building and running agents.
        </div>
      </footer>
    </div>
  );
}
