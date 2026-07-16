export function randomId(): string {
  const c = globalThis.crypto;
  if (c && 'randomUUID' in c) return c.randomUUID();
  return Math.random().toString(36).slice(2);
}
