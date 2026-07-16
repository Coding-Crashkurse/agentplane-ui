import { useCallback, useRef } from 'react';
import { useAuth } from 'react-oidc-context';

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export class UnauthorizedError extends Error {
  constructor() {
    super('Session expired: redirecting to sign-in.');
  }
}

function withAuth(init: RequestInit | undefined, token: string | undefined): RequestInit {
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

/**
 * Fetch with the bearer token attached. On 401: one forced silent renew and
 * retry, then redirect to login (SPEC §5).
 */
export function useAuthorizedFetch(): FetchLike {
  const auth = useAuth();
  const authRef = useRef(auth);
  authRef.current = auth;

  return useCallback(async (input, init) => {
    const current = authRef.current;
    let response = await fetch(input, withAuth(init, current.user?.access_token));
    if (response.status !== 401) return response;

    let renewedToken: string | undefined;
    try {
      const renewed = await current.signinSilent();
      renewedToken = renewed?.access_token;
    } catch {
      renewedToken = undefined;
    }
    if (renewedToken) {
      response = await fetch(input, withAuth(init, renewedToken));
      if (response.status !== 401) return response;
    }

    void current.signinRedirect({
      state: window.location.pathname + window.location.search,
    });
    throw new UnauthorizedError();
  }, []);
}
