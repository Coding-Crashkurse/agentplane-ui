import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import { useLocation } from 'react-router';
import { FullPageSpinner } from '../components/FullPage';
import { LandingPage } from '../pages/auth/LandingPage';

/**
 * Guards protected routes. On load it tries a non-interactive silent SSO
 * (prompt=none) so an existing IdP session survives a full page reload —
 * tokens live only in memory, so without this a reload would drop the session.
 * The silent check never prompts: no Keycloak session just falls through to the
 * public landing page, where interactive login starts only on an explicit click
 * (the target path is preserved via the OIDC state).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  const [silentTried, setSilentTried] = useState(false);

  useEffect(() => {
    if (!silentTried && !auth.isAuthenticated && !auth.isLoading && !auth.activeNavigator) {
      setSilentTried(true);
      void auth.signinSilent().catch(() => undefined);
    }
  }, [silentTried, auth]);

  if (auth.activeNavigator === 'signinRedirect') {
    return <FullPageSpinner label="Redirecting to sign-in…" />;
  }
  if (auth.isLoading || auth.activeNavigator === 'signinSilent' || (!silentTried && !auth.isAuthenticated)) {
    return <FullPageSpinner label="Checking session…" />;
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
