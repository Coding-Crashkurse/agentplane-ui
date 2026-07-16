import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { ConfigContext } from '../config';
import { testConfig } from '../test/utils';
import { DemoAuthProvider } from './DemoAuthProvider';
import { RequireAuth } from './RequireAuth';

describe('DemoAuthProvider', () => {
  it('logs in instantly without any IdP and shows the protected view', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <ConfigContext.Provider value={{ ...testConfig, demoAuth: true }}>
        <DemoAuthProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <MemoryRouter>
                <RequireAuth>
                  <div>protected content</div>
                </RequireAuth>
              </MemoryRouter>
            </ToastProvider>
          </QueryClientProvider>
        </DemoAuthProvider>
      </ConfigContext.Provider>,
    );

    // Landing first, no session yet.
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();

    // One click, logged in as the demo user; no redirect, no network.
    await user.click(screen.getByRole('button', { name: /log in/i }));
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});
