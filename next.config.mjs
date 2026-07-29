/** @type {import('next').NextConfig} */
const nextConfig = {
  // /quiz -> /questions (2026-07-29 rename, docs/design/light-theme-conversion.md
  // §7). A real 301 (not Next's default 308 `permanent: true`) via the
  // `statusCode` escape hatch, so any link already shared keeps working
  // with the exact status code asked for. redirects() runs before Proxy
  // (see proxy.js's execution-order comment), so an unauthenticated visit
  // to /quiz still lands on /login?next=%2Fquestions, not %2Fquiz.
  async redirects() {
    return [
      {
        source: '/quiz',
        destination: '/questions',
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
