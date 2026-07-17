import { LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from 'react-oidc-context';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useIsAdmin, useUsername } from '../../auth';
import { Button } from '../../components/Button';
import { Tag } from '../../components/Tag';
import { useConfig } from '../../config';
import { cn } from '../../lib/cn';
import { useTheme } from '../../theme/ThemeProvider';

const NAV_ITEMS = [
  { to: '/', label: 'Launchpad', adminOnly: false },
  { to: '/chat', label: 'Chat', adminOnly: false },
  { to: '/registry', label: 'Registry', adminOnly: false },
  { to: '/admin/users', label: 'Users', adminOnly: true },
];

export function AppShell() {
  useAuth();
  const config = useConfig();
  const username = useUsername();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link to="/" className="text-lg font-bold tracking-tight text-ink">
            agent<span className="text-accent">plane</span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-control px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent-soft text-accent'
                      : 'text-muted hover:bg-surface hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun aria-hidden className="size-4" />
              ) : (
                <Moon aria-hidden className="size-4" />
              )}
            </Button>
            {config.demoAuth && <Tag>demo mode</Tag>}
            {username && <span className="text-sm text-muted">{username}</span>}
            <Button variant="ghost" size="sm" onClick={() => navigate('/logout')}>
              <LogOut aria-hidden className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
