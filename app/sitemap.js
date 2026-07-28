const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://arah-sand.vercel.app';

// Only routes that actually exist today. /explore is allowed in robots.js
// ahead of build so crawling isn't blocked once it ships, but it has no
// page yet — listing it here would be a broken sitemap entry. Add it (and
// nothing under /admin, /account, /results, or /api — see robots.js) when
// it lands.
export default function sitemap() {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/demo`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}
