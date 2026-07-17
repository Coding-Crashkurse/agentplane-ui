import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { RequireAdmin } from '../../auth';
import { server } from '../../test/server';
import { makeAuth, renderWithProviders } from '../../test/utils';
import { UsersPage } from './UsersPage';

// testConfig.oidc.issuer is https://auth.test/realms/agentplane → this admin base.
const ADMIN = 'https://auth.test/admin/realms/agentplane';

const USERS = [
  { id: 'u-admin', username: 'demo-admin', email: 'admin@ex.test', enabled: true },
  { id: 'u-user', username: 'demo-user', email: 'user@ex.test', enabled: true },
];

const ROLES = [
  { id: 'r-user', name: 'user' },
  { id: 'r-builder', name: 'builder' },
  { id: 'r-admin', name: 'admin' },
  { id: 'r-default', name: 'default-roles-agentplane' },
];

const USER_ROLES: Record<string, { id: string; name: string }[]> = {
  'u-admin': [
    { id: 'r-admin', name: 'admin' },
    { id: 'r-user', name: 'user' },
    { id: 'r-builder', name: 'builder' },
    { id: 'r-default', name: 'default-roles-agentplane' },
  ],
  'u-user': [
    { id: 'r-user', name: 'user' },
    { id: 'r-default', name: 'default-roles-agentplane' },
  ],
};

function adminHandlers() {
  return [
    http.get(`${ADMIN}/users`, () => HttpResponse.json(USERS)),
    http.get(`${ADMIN}/roles`, () => HttpResponse.json(ROLES)),
    http.get(`${ADMIN}/groups`, () =>
      HttpResponse.json([
        { id: 'g-admins', name: 'platform-admins', path: '/platform-admins' },
        { id: 'g-research', name: 'research', path: '/research' },
      ]),
    ),
    // platform-admins maps the admin realm role; research maps none.
    http.get(`${ADMIN}/groups/:id/role-mappings/realm`, ({ params }) =>
      HttpResponse.json(params.id === 'g-admins' ? [{ id: 'r-admin', name: 'admin' }] : []),
    ),
    http.get(`${ADMIN}/users/:id/role-mappings/realm`, ({ params }) =>
      HttpResponse.json(USER_ROLES[params.id as string] ?? []),
    ),
    http.get(`${ADMIN}/users/:id/groups`, () => HttpResponse.json([])),
  ];
}

const adminAuth = () => makeAuth({ roles: ['admin', 'user'], username: 'demo-admin' });

describe('UsersPage', () => {
  it('lists users with status and role badges', async () => {
    server.use(...adminHandlers());
    renderWithProviders(<UsersPage />, { auth: adminAuth() });

    const row = (await screen.findByText('demo-user')).closest('tr')!;
    expect(within(row).getByText('user@ex.test')).toBeInTheDocument();
    expect(within(row).getByText('enabled')).toBeInTheDocument();
    // Role badges are loaded per user; default-roles-* is filtered out.
    await waitFor(() => expect(within(row).getByText('user')).toBeInTheDocument());
    expect(within(row).queryByText(/default-roles/)).not.toBeInTheDocument();
  });

  it('never renders an admin role toggle in the drawer', async () => {
    server.use(...adminHandlers());
    const user = userEvent.setup();
    renderWithProviders(<UsersPage />, { auth: adminAuth() });

    await user.click(await screen.findByText('demo-user'));
    const drawer = await screen.findByRole('dialog', { name: 'demo-user' });
    expect(within(drawer).getByRole('checkbox', { name: /^user$/i })).toBeInTheDocument();
    expect(within(drawer).getByRole('checkbox', { name: /builder/i })).toBeInTheDocument();
    // admin is appointed by the superuser: never a role toggle here.
    expect(within(drawer).queryByRole('checkbox', { name: /^admin$/i })).not.toBeInTheDocument();
  });

  it('hides teams that confer the admin realm role', async () => {
    server.use(...adminHandlers());
    const user = userEvent.setup();
    renderWithProviders(<UsersPage />, { auth: adminAuth() });

    await user.click(await screen.findByText('demo-user'));
    const drawer = await screen.findByRole('dialog', { name: 'demo-user' });
    // A normal team is offered...
    expect(await within(drawer).findByRole('checkbox', { name: /research/i })).toBeInTheDocument();
    // ...but platform-admins maps the admin realm role, so joining it would grant
    // admin. That toggle must never appear here (SPEC §11).
    expect(
      within(drawer).queryByRole('checkbox', { name: /platform-admins/i }),
    ).not.toBeInTheDocument();
  });

  it('grants the builder role via POST role-mappings/realm', async () => {
    server.use(...adminHandlers());
    let posted: unknown;
    server.use(
      http.post(`${ADMIN}/users/u-user/role-mappings/realm`, async ({ request }) => {
        posted = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<UsersPage />, { auth: adminAuth() });

    await user.click(await screen.findByText('demo-user'));
    const drawer = await screen.findByRole('dialog', { name: 'demo-user' });
    const builder = await within(drawer).findByRole('checkbox', { name: /builder/i });
    expect(builder).not.toBeChecked();
    await user.click(builder);

    await waitFor(() => expect(posted).toEqual([{ id: 'r-builder', name: 'builder' }]));
  });

  it('disables a user with PUT { enabled: false }', async () => {
    server.use(...adminHandlers());
    let body: unknown;
    server.use(
      http.put(`${ADMIN}/users/u-user`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<UsersPage />, { auth: adminAuth() });

    await user.click(await screen.findByText('demo-user'));
    const drawer = await screen.findByRole('dialog', { name: 'demo-user' });
    await user.click(within(drawer).getByRole('checkbox', { name: /enabled/i }));

    await waitFor(() => expect(body).toEqual({ enabled: false }));
  });

  it('surfaces a Keycloak 403 verbatim when a change is forbidden', async () => {
    server.use(...adminHandlers());
    server.use(
      http.post(`${ADMIN}/users/u-user/role-mappings/realm`, () =>
        HttpResponse.json({ errorMessage: 'you cannot map builder here' }, { status: 403 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<UsersPage />, { auth: adminAuth() });

    await user.click(await screen.findByText('demo-user'));
    const drawer = await screen.findByRole('dialog', { name: 'demo-user' });
    await user.click(await within(drawer).findByRole('checkbox', { name: /builder/i }));

    expect(await within(drawer).findByText('you cannot map builder here')).toBeInTheDocument();
  });
});

describe('RequireAdmin', () => {
  it('renders a not-authorized state for non-admins and never hits the admin API', async () => {
    let called = false;
    server.use(
      http.get(`${ADMIN}/users`, () => {
        called = true;
        return HttpResponse.json(USERS);
      }),
    );
    renderWithProviders(
      <RequireAdmin>
        <UsersPage />
      </RequireAdmin>,
      { auth: makeAuth({ roles: ['user'] }) },
    );
    expect(await screen.findByText('Not authorized')).toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
    expect(called).toBe(false);
  });

  it('renders admin children for admins', async () => {
    server.use(...adminHandlers());
    renderWithProviders(
      <RequireAdmin>
        <UsersPage />
      </RequireAdmin>,
      { auth: adminAuth() },
    );
    expect(await screen.findByText('demo-user')).toBeInTheDocument();
  });
});
