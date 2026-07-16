import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthContextProps } from 'react-oidc-context';
import { describe, expect, it } from 'vitest';
import { makeAuth, renderWithProviders } from '../test/utils';
import { RequireAuth } from './RequireAuth';

function unauthenticated(overrides: Partial<AuthContextProps> = {}): AuthContextProps {
  return {
    ...makeAuth(),
    isAuthenticated: false,
    user: undefined,
    ...overrides,
  } as AuthContextProps;
}

describe('RequireAuth', () => {
  it('shows the public landing without contacting the IdP until Sign in is clicked', async () => {
    const user = userEvent.setup();
    const auth = unauthenticated();
    renderWithProviders(
      <RequireAuth>
        <div>protected content</div>
      </RequireAuth>,
      { auth, route: '/registry?kind=agent' },
    );

    // Public area is always visible; no auto-redirect on mount.
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(auth.signinRedirect).not.toHaveBeenCalled();

    // Login starts only on click, preserving the target path.
    await user.click(screen.getByRole('button', { name: /log in/i }));
    expect(auth.signinRedirect).toHaveBeenCalledWith({ state: '/registry?kind=agent' });
  });

  it('renders children when authenticated', () => {
    renderWithProviders(
      <RequireAuth>
        <div>protected content</div>
      </RequireAuth>,
    );
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('shows sign-in errors on the landing page instead of replacing it', () => {
    renderWithProviders(
      <RequireAuth>
        <div>protected content</div>
      </RequireAuth>,
      {
        auth: unauthenticated({
          error: Object.assign(new Error('Failed to fetch'), { source: 'unknown' as const }),
        }),
      },
    );
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByText(/sign-in failed/i)).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });
});
