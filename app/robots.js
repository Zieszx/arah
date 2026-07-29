const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://arah-sand.vercel.app';

// Student results must never be indexed by a search engine — /results,
// alongside /admin, /account and /questions, is disallowed for that
// reason, not because it's merely private. /questions (renamed from
// /quiz — docs/design/light-theme-conversion.md §7) is auth-gated and
// personal in the same way /account is, so it belongs in this list on
// the same grounds. /api is disallowed because it serves data, not
// pages, and has nothing useful to offer a crawler. /quiz itself needs
// no entry here: it 301s to /questions (next.config.mjs) before a
// crawler ever sees a page to index.
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/explore', '/demo'],
      disallow: ['/admin', '/account', '/results', '/questions', '/api'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
