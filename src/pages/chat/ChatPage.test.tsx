import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { sseErrorBody } from '../../api/a2a/__fixtures__/stream';
import { entriesPage } from '../../api/registry/__fixtures__/entries';
import { ECHO_AGENT_URL, REGISTRY_URL, sseResponse } from '../../test/handlers';
import { server } from '../../test/server';
import { renderWithProviders } from '../../test/utils';
import { ChatPage } from './ChatPage';

async function pickEchoAgent(user: ReturnType<typeof userEvent.setup>) {
  renderWithProviders(<ChatPage />);
  await user.click(await screen.findByRole('button', { name: /echo agent/i }));
}

describe('ChatPage', () => {
  it('streams the reply tokens in order and shows the final task state', async () => {
    const user = userEvent.setup();
    await pickEchoAgent(user);

    await user.type(screen.getByLabelText('Message'), 'ping');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    // The user message appears immediately, the streamed reply token by token.
    expect(screen.getByText('ping')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('Hello world', { exact: false })).toBeInTheDocument(),
    );
    // Task state transitions end in "completed" (submitted → working → completed).
    await waitFor(() => expect(screen.getByTestId('task-state')).toHaveTextContent('completed'));
    // Completed exchanges link to Langfuse when configured.
    expect(screen.getByRole('link', { name: /langfuse/i })).toHaveAttribute(
      'href',
      'https://langfuse.test',
    );
  });

  it('shows the A2A error message verbatim on failure', async () => {
    server.use(http.post(ECHO_AGENT_URL, () => sseResponse(sseErrorBody('Echo agent is on fire'))));
    const user = userEvent.setup();
    await pickEchoAgent(user);

    await user.type(screen.getByLabelText('Message'), 'ping');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Echo agent is on fire');
    await waitFor(() => expect(screen.getByTestId('task-state')).toHaveTextContent('failed'));
  });

  it('offers the semantic toggle only when capabilities report it and hints on degradation', async () => {
    server.use(
      http.get(`${REGISTRY_URL}/agents/search`, () =>
        HttpResponse.json(entriesPage, { headers: { 'X-Degraded': 'semantic' } }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<ChatPage />);

    // capabilities fixture reports semantic_search: true → toggle is visible.
    expect(await screen.findByLabelText('Semantic')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/search agents/i), 'echo');
    expect(
      await screen.findByText(/semantic search is degraded/i, undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});
