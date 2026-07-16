/** Minimal SSE parser: yields the `data:` payload of each event. */
export async function* parseSse(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string, void, undefined> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const dataOf = (rawEvent: string): string =>
    rawEvent
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''))
      .join('\n');

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let separator: number;
      while ((separator = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        const data = dataOf(rawEvent);
        if (data) yield data;
      }
    }
    const trailing = dataOf(buffer);
    if (trailing) yield trailing;
  } finally {
    reader.releaseLock();
  }
}
