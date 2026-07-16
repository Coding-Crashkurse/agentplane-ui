import type { User } from 'oidc-client-ts';
import { useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthContextProps } from 'react-oidc-context';

const DEMO_PROFILE = {
  sub: 'demo-user',
  preferred_username: 'demo',
  name: 'Demo User',
  realm_access: { roles: ['user', 'admin'] },
};

/**
 * Fake auth for previews without an IdP (enabled via `demoAuth` in
 * config.json). "Log in" succeeds instantly with an in-memory demo user;
 * no network, no redirect. UI convenience only: the real APIs still enforce
 * authorization, so this never grants actual access to anything.
 */
export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);

  const value = useMemo(() => {
    const user = signedIn
      ? ({
          access_token: 'demo-token',
          token_type: 'Bearer',
          expired: false,
          state: undefined,
          profile: DEMO_PROFILE,
        } as unknown as User)
      : null;
    return {
      isAuthenticated: signedIn,
      isLoading: false,
      user,
      activeNavigator: undefined,
      error: undefined,
      signinRedirect: async () => setSignedIn(true),
      signinSilent: async () => user,
      signoutRedirect: async () => setSignedIn(false),
      removeUser: async () => setSignedIn(false),
    } as unknown as AuthContextProps;
  }, [signedIn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
