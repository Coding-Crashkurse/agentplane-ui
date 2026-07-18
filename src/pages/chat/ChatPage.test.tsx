import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { echoStreamFrames, sseBody, sseErrorBody } from '../../api/a2a/__fixtures__/stream';
import { entriesPage } from '../../api/registry/__fixtures__/entries';
import { ECHO_AGENT_URL, REGISTRY_URL, sseResponse } from '../../test/handlers';
import { server } from '../../test/server';
import { makeAuth, renderWithProviders, testConfig } from '../../test/utils';
import { ChatPage } from './ChatPage';

/** The page reads the selected agent from /chat/:agentId (real route shape). */
function renderChat(options?: Parameters<typeof renderWithProviders>[1]) {
  return renderWithProviders(
    <Routes>
      <Route path="/chat/:agentId?" element={<ChatPage />} />
    </Routes>,
    { route: '/chat', ...options },
  );
}

async function pickEchoAgent(
  user: ReturnType<typeof userEvent.setup>,
  options?: Parameters<typeof renderWithProviders>[1],
) {
  renderChat(options);
  await user.click(await screen.findByRole('button', { name: /echo agent/i }));
}

const admin = { auth: makeAuth({ roles: ['user', 'admin'] }) };

describe('ChatPage', () => {
  it('restores the selected agent from the URL (deep link, survives reloads)', async () => {
    renderChat({ route: '/chat/echo-1' });
    expect(await screen.findByRole('heading', { name: 'Echo Agent' })).toBeInTheDocument();
  });

  it('restores only the latest conversation and starts fresh via "New chat"', async () => {
    server.use(
      http.post(ECHO_AGENT_URL, async ({ request }) => {
        const { method } = (await request.json()) as { method?: string };
        if (method !== 'ListTasks') return sseResponse(sseBody(echoStreamFrames(['ok'])));
        return HttpResponse.json({
          jsonrpc: '2.0',
          id: 1,
          result: {
            // Newest first: task-9 is the current conversation, task-1 an older one.
            tasks: [
              {
                id: 'task-9',
                contextId: 'ctx-9',
                status: { state: 'TASK_STATE_COMPLETED' },
                history: [
                  { messageId: 'u1', role: 'ROLE_USER', parts: [{ text: 'earlier question' }] },
                ],
                artifacts: [{ artifactId: 'a1', name: 'output', parts: [{ text: 'earlier answer' }] }],
              },
              {
                id: 'task-1',
                contextId: 'ctx-old',
                status: { state: 'TASK_STATE_COMPLETED' },
                history: [
                  { messageId: 'u0', role: 'ROLE_USER', parts: [{ text: 'ancient question' }] },
                ],
                artifacts: [{ artifactId: 'a0', name: 'output', parts: [{ text: 'ancient answer' }] }],
              },
            ],
          },
        });
      }),
    );
    const user = userEvent.setup();
    await pickEchoAgent(user);

    expect(await screen.findByText('earlier question')).toBeInTheDocument();
    expect(screen.getByText('earlier answer')).toBeInTheDocument();
    // Older contexts are not flattened into the view.
    expect(screen.queryByText('ancient question')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /new chat/i }));
    expect(screen.queryByText('earlier question')).not.toBeInTheDocument();
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
  });

  it('streams the reply tokens in order and shows the final task state', async () => {
    const user = userEvent.setup();
    await pickEchoAgent(user, admin);

    await user.type(screen.getByLabelText('Message'), 'ping');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    // The user message appears immediately, the streamed reply token by token.
    expect(screen.getByText('ping')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('Hello world', { exact: false })).toBeInTheDocument(),
    );
    // Task state transitions end in "completed" (submitted → working → completed).
    await waitFor(() => expect(screen.getByTestId('task-state')).toHaveTextContent('completed'));
    // Finished exchanges expose a trace link to admins; with only langfuseUrl
    // configured (no traceUrlTemplate) it falls back to the tracing UI root (§12).
    expect(screen.getByRole('link', { name: /trace/i })).toHaveAttribute(
      'href',
      'https://langfuse.test',
    );
  });

  it('builds an exact trace deep link from traceUrlTemplate carrying the sent trace id', async () => {
    const user = userEvent.setup();
    await pickEchoAgent(user, {
      ...admin,
      config: { ...testConfig, traceUrlTemplate: 'https://langfuse.test/traces/{traceId}' },
    });

    await user.type(screen.getByLabelText('Message'), 'ping');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByTestId('task-state')).toHaveTextContent('completed'));
    const link = screen.getByRole('link', { name: /trace/i });
    // The link targets the specific trace id, not the tracing UI root.
    expect(link).toHaveAttribute(
      'href',
      expect.stringMatching(
        /^https:\/\/langfuse\.test\/auth\/sign-in\?targetPath=%2Ftraces%2F[0-9a-f]{32}$/,
      ),
    );
  });

  it('hides the trace link from non-admins (tracing backend is admin-only)', async () => {
    const user = userEvent.setup();
    await pickEchoAgent(user); // default auth: plain 'user' role

    await user.type(screen.getByLabelText('Message'), 'ping');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByTestId('task-state')).toHaveTextContent('completed'));
    expect(screen.queryByRole('link', { name: /trace/i })).not.toBeInTheDocument();
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
    renderChat();

    // capabilities fixture reports semantic_search: true → toggle is visible.
    expect(await screen.findByLabelText('Semantic')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/search agents/i), 'echo');
    expect(
      await screen.findByText(/semantic search is degraded/i, undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});
