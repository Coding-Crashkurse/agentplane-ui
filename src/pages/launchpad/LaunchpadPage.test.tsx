import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { REGISTRY_URL } from '../../test/handlers';
import { server } from '../../test/server';
import { makeAuth, renderWithProviders } from '../../test/utils';
import { LaunchpadPage } from './LaunchpadPage';

describe('LaunchpadPage', () => {
  it('filters config tiles by the user roles', async () => {
    renderWithProviders(<LaunchpadPage />, { auth: makeAuth({ roles: ['user'] }) });

    expect(screen.getByRole('heading', { name: /welcome, demo/i })).toBeInTheDocument();
    expect(screen.getByText('Agent Builder')).toBeInTheDocument();
    // Admin-only tile is hidden for plain users (convenience only: API enforces).
    expect(screen.queryByText('Observability')).not.toBeInTheDocument();
    // Built-in tiles are always present.
    expect(screen.getByRole('link', { name: /chat/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /registry/i })).toBeInTheDocument();
  });

  it('shows admin tiles for admins', () => {
    renderWithProviders(<LaunchpadPage />, { auth: makeAuth({ roles: ['user', 'admin'] }) });
    expect(screen.getByText('Observability')).toBeInTheDocument();
  });

  it('shows the registry stats strip with counts by status', async () => {
    renderWithProviders(<LaunchpadPage />);
    await waitFor(() => expect(screen.getByTestId('stats-strip')).toBeInTheDocument());
    expect(screen.getByTestId('stats-strip')).toHaveTextContent('4 registry entries');
    expect(screen.getByTestId('stats-strip')).toHaveTextContent('healthy');
  });

  it('soft-fails the stats strip when the registry is unreachable', async () => {
    server.use(http.get(`${REGISTRY_URL}/agents`, () => new HttpResponse(null, { status: 503 })));
    renderWithProviders(<LaunchpadPage />);
    // The page renders fine; the strip simply never appears.
    expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('stats-strip')).not.toBeInTheDocument());
  });
});
