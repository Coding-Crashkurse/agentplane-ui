import { http, HttpResponse } from 'msw';
import { echoStreamFrames, sseBody } from '../api/a2a/__fixtures__/stream';
import { capabilitiesFixture, entriesPage } from '../api/registry/__fixtures__/entries';

export const REGISTRY_URL = 'https://api.test/registry';
export const ECHO_AGENT_URL = 'https://api.test/a2a/echo';

export function sseResponse(body: string): Response {
  return new HttpResponse(body, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

export const defaultHandlers = [
  http.get(`${REGISTRY_URL}/agents`, () => HttpResponse.json(entriesPage)),
  http.get(`${REGISTRY_URL}/agents/search`, ({ request }) => {
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? '';
    const items = entriesPage.items.filter(
      (entry) =>
        entry.name.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q),
    );
    return HttpResponse.json({ ...entriesPage, items, total: items.length });
  }),
  http.get(`${REGISTRY_URL}/capabilities`, () => HttpResponse.json(capabilitiesFixture)),
  http.post(ECHO_AGENT_URL, () => sseResponse(sseBody(echoStreamFrames(['Hello', ' world'])))),
];
