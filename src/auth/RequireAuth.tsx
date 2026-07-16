import type { ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import { useLocation } from 'react-router';
import { FullPageSpinner } from '../components/FullPage';
import { LandingPage } from '../pages/auth/LandingPage';

/**
 * Guards protected routes. Unauthenticated visitors always see the public
 * landing page: login (and any contact with the IdP) starts only when they
 * click "Sign in"; the target path is preserved via the OIDC state.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return <FullPageSpinner label="Checking session…" />;
  }
  if (auth.activeNavigator === 'signinRedirect') {
    return <FullPageSpinner label="Redirecting to sign-in…" />;
  }
  if (!auth.isAuthenticated) {
    return (
      <LandingPage
        error={auth.error?.message}
        onSignIn={() => void auth.signinRedirect({ state: location.pathname + location.search })}
      />
    );
  }
  return children;
}
