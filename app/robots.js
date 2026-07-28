const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://arah-sand.vercel.app';

// Student results must never be indexed by a search engine — /results,
// alongside /admin and /account, is disallowed for that reason, not
// because it's merely private. /api is disallowed because it serves data,
// not pages, and has nothing useful to offer a crawler.
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/explore', '/demo'],
      disallow: ['/admin', '/account', '/results', '/api'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
