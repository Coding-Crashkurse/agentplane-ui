import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { User } from 'oidc-client-ts';
import type { ReactElement, ReactNode } from 'react';
import { AuthContext, type AuthContextProps } from 'react-oidc-context';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { ConfigContext, type AppConfig } from '../config';
import { ThemeProvider } from '../theme/ThemeProvider';

export const testConfig: AppConfig = {
  oidc: { issuer: 'https://auth.test/realms/agentplane', clientId: 'agentplane-ui' },
  registryUrl: 'https://api.test/registry',
  a2aBaseUrl: 'https://api.test',
  langfuseUrl: 'https://langfuse.test',
  demoAuth: false,
  links: [
    {
      id: 'builder',
      name: 'Agent Builder',
      description: 'Build flows',
      icon: 'workflow',
      url: 'https://builder.test',
      roles: ['user', 'admin'],
    },
    {
      id: 'langfuse',
      name: 'Observability',
      description: 'Traces & costs',
      icon: 'activity',
      url: 'https://langfuse.test',
      roles: ['admin'],
    },
  ],
};

export interface MockAuthOptions {
  roles?: string[];
  username?: string;
}

export function makeAuth({ roles = ['user'], username = 'demo' }: MockAuthOptions = {}) {
  const user = {
    access_token: 'test-token',
    token_type: 'Bearer',
    expired: false,
    state: undefined,
    profile: {
      // The platform records the OIDC subject as `owner`; tests use the
      // username as subject so ownership checks line up with fixtures.
      sub: username,
      preferred_username: username,
      name: 'Demo User',
      realm_access: { roles },
    },
  } as unknown as User;

  return {
    isAuthenticated: true,
    isLoading: false,
    user,
    activeNavigator: undefined,
    error: undefined,
    signinSilent: vi.fn(async () => user),
    signinRedirect: vi.fn(async () => undefined),
    signoutRedirect: vi.fn(async () => undefined),
    removeUser: vi.fn(async () => undefined),
  } as unknown as AuthContextProps;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    auth = makeAuth(),
    config = testConfig,
    route = '/',
  }: { auth?: AuthContextProps; config?: AppConfig; route?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ConfigContext.Provider value={config}>
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
            </ToastProvider>
          </QueryClientProvider>
        </AuthContext.Provider>
      </ThemeProvider>
    </ConfigContext.Provider>
  );

  return { ...render(ui, { wrapper }), queryClient, auth };
}
