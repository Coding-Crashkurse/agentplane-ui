import { expect, test } from '@playwright/test';

const USERNAME = process.env.E2E_USERNAME ?? 'demo';
const PASSWORD = process.env.E2E_PASSWORD ?? 'demo';

/**
 * Mirrors the platform smoke test from the UI side (SPEC §9):
 * login → role-filtered launchpad → registry lists the echo agent healthy →
 * chat round-trip with a streamed reply.
 */
test('login, launchpad, registry, chat round-trip @e2e', async ({ page }) => {
  await page.goto('/');

  // Public landing is visible without a session; login starts on click.
  await page.getByRole('button', { name: /log in/i }).click();

  // Keycloak login form (shared realm).
  await page.locator('#username').fill(USERNAME);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#kc-login').click();

  // Launchpad with role-filtered tiles.
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /chat/i }).first()).toBeVisible();

  // Registry lists the echo agent as healthy.
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Registry' })
    .click();
  const echoRow = page.getByRole('row', { name: /echo/i });
  await expect(echoRow).toBeVisible();
  await expect(echoRow).toContainText(/healthy/i);

  // Chat: send "ping", receive a streamed reply.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Chat' }).click();
  await page.getByRole('button', { name: /echo/i }).first().click();
  await page.getByLabel('Message').fill('ping');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(page.locator('[data-role="agent-message"]').last()).toContainText(/ping/i, {
    timeout: 30_000,
  });
});
