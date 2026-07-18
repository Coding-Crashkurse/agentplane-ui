import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InMemoryWebStorage, WebStorageStateStore } from 'oidc-client-ts';
import { useState, type ReactNode } from 'react';
import { AuthProvider, type AuthProviderProps } from 'react-oidc-context';
import { BrowserRouter, Route, Routes } from 'react-router';
import { RequireAdmin, RequireAuth } from './auth';
import { DemoAuthProvider } from './auth/DemoAuthProvider';
import { ToastProvider } from './components/Toast';
import { ConfigContext, type AppConfig } from './config';
import { ThemeProvider } from './theme/ThemeProvider';
import { CallbackPage } from './pages/auth/CallbackPage';
import { LogoutPage } from './pages/auth/LogoutPage';
import { ChatPage } from './pages/chat/ChatPage';
import { LaunchpadPage } from './pages/launchpad/LaunchpadPage';
import { UsersPage } from './pages/admin/UsersPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegistryPage } from './pages/registry/RegistryPage';
import { AppShell } from './pages/shell/AppShell';

function oidcProps(config: AppConfig): AuthProviderProps {
  return {
    authority: config.oidc.issuer,
    client_id: config.oidc.clientId,
    redirect_uri: `${window.location.origin}/callback`,
    silent_redirect_uri: `${window.location.origin}/callback`,
    post_logout_redirect_uri: `${window.location.origin}/logout`,
    automaticSilentRenew: true,
    silentRequestTimeoutInSeconds: 10,
    // Tokens stay in memory, never in Web Storage (CLAUDE.md invariant 5).
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    onSigninCallback: () => {
      // Strip the authorization code from the URL; CallbackPage navigates on.
      window.history.replaceState({}, document.title, window.location.pathname);
    },
  };
}

/** Real OIDC in normal operation; instant fake login when config.demoAuth is set. */
function AppAuthProvider({ config, children }: { config: AppConfig; children: ReactNode }) {
  const [oidc] = useState(() => (config.demoAuth ? null : oidcProps(config)));
  if (config.demoAuth) return <DemoAuthProvider>{children}</DemoAuthProvider>;
  return <AuthProvider {...oidc!}>{children}</AuthProvider>;
}

export function App({ config }: { config: AppConfig }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 },
        },
      }),
  );

  return (
    <ConfigContext.Provider value={config}>
      <ThemeProvider>
        <AppAuthProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/callback" element={<CallbackPage />} />
                  <Route path="/logout" element={<LogoutPage />} />
                  <Route
                    element={
                      <RequireAuth>
                        <AppShell />
                      </RequireAuth>
                    }
                  >
                    <Route index element={<LaunchpadPage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="registry" element={<RegistryPage />} />
                    <Route
                      path="admin/users"
                      element={
                        <RequireAdmin>
                          <UsersPage />
                        </RequireAdmin>
                      }
                    />
                  </Route>
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </BrowserRouter>
            </ToastProvider>
          </QueryClientProvider>
        </AppAuthProvider>
      </ThemeProvider>
    </ConfigContext.Provider>
  );
}
