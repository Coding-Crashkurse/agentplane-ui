import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { echoAgent, entriesPage } from '../../api/registry/__fixtures__/entries';
import { REGISTRY_URL } from '../../test/handlers';
import { server } from '../../test/server';
import { makeAuth, renderWithProviders } from '../../test/utils';
import { RegistryPage } from './RegistryPage';

describe('RegistryPage', () => {
  it('lists entries with status badges and kind labels', async () => {
    renderWithProviders(<RegistryPage />);
    expect(await screen.findByText('Echo Agent')).toBeInTheDocument();
    expect(screen.getByText('Search MCP Server')).toBeInTheDocument();

    const echoRow = screen.getByText('Echo Agent').closest('tr')!;
    expect(within(echoRow).getByText('healthy')).toBeInTheDocument();
    expect(within(echoRow).getByText('agent')).toBeInTheDocument();

    const mcpRow = screen.getByText('Search MCP Server').closest('tr')!;
    expect(within(mcpRow).getByText('starting')).toBeInTheDocument();
    expect(within(mcpRow).getByText('MCP server')).toBeInTheDocument();
  });

  it('hides the show-all-owners toggle from non-admins and shows it for admins', async () => {
    const { unmount } = renderWithProviders(<RegistryPage />, {
      auth: makeAuth({ roles: ['user'] }),
    });
    await screen.findByText('Echo Agent');
    expect(screen.queryByLabelText(/show all owners/i)).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<RegistryPage />, { auth: makeAuth({ roles: ['user', 'admin'] }) });
    expect(await screen.findByLabelText(/show all owners/i)).toBeInTheDocument();
  });

  it('opens the detail drawer with card JSON and deletes with confirmation', async () => {
    const user = userEvent.setup();
    let deleted = false;
    server.use(
      http.delete(`${REGISTRY_URL}/agents/echo-1`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<RegistryPage />, { auth: makeAuth({ username: 'demo' }) });
    await user.click(await screen.findByText('Echo Agent'));

    const drawer = await screen.findByRole('dialog', { name: 'Echo Agent' });
    expect(within(drawer).getByTestId('entry-owner')).toHaveTextContent('demo');
    expect(within(drawer).getAllByText(/https:\/\/api\.test\/a2a\/echo/).length).toBeGreaterThan(0);
    expect(within(drawer).getByText(/"protocolVersion"/)).toBeInTheDocument();

    // Owner may delete: with an explicit confirmation step.
    await user.click(within(drawer).getByRole('button', { name: /delete entry/i }));
    await user.click(within(drawer).getByRole('button', { name: /confirm delete/i }));

    await waitFor(() => expect(deleted).toBe(true));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows API validation errors inline in the register-external flow', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('https://api.test/a2a/external/.well-known/agent-card.json', () =>
        HttpResponse.json({ name: 'External Agent', url: 'https://api.test/a2a/external' }),
      ),
      http.post(`${REGISTRY_URL}/agents`, () =>
        HttpResponse.json(
          { error: { code: 'invalid_url', message: 'Private URLs are not allowed' } },
          { status: 400 },
        ),
      ),
    );

    renderWithProviders(<RegistryPage />);
    await user.click(await screen.findByRole('button', { name: /register external agent/i }));

    const drawer = await screen.findByRole('dialog', { name: /register external agent/i });
    await user.type(
      within(drawer).getByLabelText(/agent gateway url/i),
      'https://api.test/a2a/external',
    );
    await user.click(within(drawer).getByRole('button', { name: /fetch card/i }));
    expect(await within(drawer).findByText('External Agent')).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: /register agent/i }));
    expect(await within(drawer).findByText('Private URLs are not allowed')).toBeInTheDocument();
  });

  it('shows a disabled badge and re-enables via the drawer toggle', async () => {
    const user = userEvent.setup();
    const disabledEntry = { ...echoAgent, enabled: false };
    let putBody: unknown;
    server.use(
      http.get(`${REGISTRY_URL}/agents`, () =>
        HttpResponse.json({ ...entriesPage, items: [disabledEntry], total: 1 }),
      ),
      http.put(`${REGISTRY_URL}/agents/echo-1`, async ({ request }) => {
        putBody = await request.json();
        return HttpResponse.json({ ...disabledEntry, enabled: true, status: 'starting' });
      }),
    );

    renderWithProviders(<RegistryPage />, { auth: makeAuth({ username: 'demo' }) });
    const row = (await screen.findByText('Echo Agent')).closest('tr')!;
    expect(within(row).getByText('disabled')).toBeInTheDocument();

    await user.click(screen.getByText('Echo Agent'));
    const drawer = await screen.findByRole('dialog', { name: 'Echo Agent' });
    await user.click(within(drawer).getByRole('button', { name: /enable entry/i }));

    await waitFor(() => expect(putBody).toEqual({ enabled: true }));
  });
});
