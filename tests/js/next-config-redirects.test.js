// Covers the /quiz -> /questions rename's redirect contract
// (docs/design/light-theme-conversion.md §7): next.config.mjs's
// `redirects()` must 301 the old route to the new one, using the literal
// 301 status code (via `statusCode`, not Next's default 308 from
// `permanent: true`) so a link already shared keeps resolving with the
// exact semantics asked for.
import { describe, it, expect } from 'vitest';
import nextConfig from '@/next.config.mjs';

describe('/quiz -> /questions redirect', () => {
  it('redirects() returns a permanent 301 from /quiz to /questions', async () => {
    const redirects = await nextConfig.redirects();
    const quizRedirect = redirects.find((r) => r.source === '/quiz');

    expect(quizRedirect).toBeDefined();
    expect(quizRedirect.destination).toBe('/questions');
    expect(quizRedirect.statusCode).toBe(301);
    // `statusCode` and `permanent` are mutually exclusive in Next's
    // redirects() config — asserting `permanent` is absent guards against
    // a future edit accidentally reintroducing it and silently falling
    // back to a 308.
    expect(quizRedirect.permanent).toBeUndefined();
  });
});
