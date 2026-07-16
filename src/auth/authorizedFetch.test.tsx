import { renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { User } from 'oidc-client-ts';
import type { ReactNode } from 'react';
import { AuthContext, type AuthContextProps } from 'react-oidc-context';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../test/server';
import { makeAuth } from '../test/utils';
import { UnauthorizedError, useAuthorizedFetch } from './authorizedFetch';

const API = 'https://api.test/protected';

function renderFetch(auth: AuthContextProps) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
  );
  return renderHook(() => useAuthorizedFetch(), { wrapper }).result.current;
}

describe('useAuthorizedFetch', () => {
  it('attaches the bearer token', async () => {
    let seen: string | null = null;
    server.use(
      http.get(API, ({ request }) => {
        seen = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    const response = await renderFetch(makeAuth())(API);
    expect(response.status).toBe(200);
    expect(seen).toBe('Bearer test-token');
  });

  it('renews once on 401 and retries with the new token', async () => {
    const auth = makeAuth();
    const renewedUser = { access_token: 'renewed-token' } as unknown as User;
    auth.signinSilent = vi.fn(async () => renewedUser);

    const tokens: Array<string | null> = [];
    server.use(
      http.get(API, ({ request }) => {
        const token = request.headers.get('Authorization');
        tokens.push(token);
        return token === 'Bearer renewed-token'
          ? HttpResponse.json({ ok: true })
          : new HttpResponse(null, { status: 401 });
      }),
    );

    const response = await renderFetch(auth)(API);
    expect(response.status).toBe(200);
    expect(auth.signinSilent).toHaveBeenCalledTimes(1);
    expect(tokens).toEqual(['Bearer test-token', 'Bearer renewed-token']);
  });

  it('redirects to login when the retry is also unauthorized', async () => {
    const auth = makeAuth();
    server.use(http.get(API, () => new HttpResponse(null, { status: 401 })));

    await expect(renderFetch(auth)(API)).rejects.toThrowError(UnauthorizedError);
    expect(auth.signinRedirect).toHaveBeenCalledTimes(1);
  });
});
