// Every internal link in the site chrome must point at a route that exists.
//
// This test exists because one did not. The footer linked to /privacy on
// every page of the site for the whole build, behind a comment saying the
// 404 was "expected and fine" during development. Nothing failed, nothing
// warned, and it was only caught at delivery by watching which URLs the
// browser prefetched — a broken link in the chrome appears on every page at
// once, which somehow makes it easier to stop seeing, not harder.
//
// Resolution is checked against the filesystem rather than by fetching, so it
// runs offline and fails at the moment a link is added ahead of its route.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const APP = path.resolve(process.cwd(), 'app');

/**
 * Does `href` correspond to a real App Router page?
 *
 * Walks the segments, allowing a route group at any level — (auth) and
 * (admin) are directories that do not appear in the URL — and a dynamic
 * segment as a last resort, so /explore/engineering matches
 * app/explore/[field]/page.jsx.
 */
function routeExists(href) {
  const segments = href.split('/').filter(Boolean);

  function walk(dir, rest) {
    if (rest.length === 0) {
      return ['page.jsx', 'page.js', 'route.js'].some((f) =>
        fs.existsSync(path.join(dir, f))
      );
    }
    const [head, ...tail] = rest;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory());
    } catch {
      return false;
    }

    // Exact segment match.
    if (entries.some((e) => e.name === head) && walk(path.join(dir, head), tail)) {
      return true;
    }
    // Route groups are invisible in the URL, so try descending through one
    // without consuming a segment.
    for (const entry of entries) {
      if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        if (walk(path.join(dir, entry.name), rest)) return true;
      }
    }
    // A dynamic segment matches anything — checked last so a literal route
    // always wins.
    for (const entry of entries) {
      if (entry.name.startsWith('[') && walk(path.join(dir, entry.name), tail)) {
        return true;
      }
    }
    return false;
  }

  return walk(APP, segments);
}

/** Every internal href literal in a chrome component. */
function hrefsIn(file) {
  const source = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
  const found = new Set();
  for (const m of source.matchAll(/href[:=]\s*['"](\/[^'"?#]*)['"]/g)) {
    found.add(m[1]);
  }
  return [...found];
}

const CHROME_FILES = [
  'components/layout/SiteFooter.jsx',
  'components/layout/header-client.jsx',
  'components/admin/nav-items.js',
];

describe('site chrome links resolve to real routes', () => {
  it('the sanity check itself works', () => {
    // If routeExists said yes to everything, this suite would prove nothing.
    expect(routeExists('/')).toBe(true);
    expect(routeExists('/explore')).toBe(true);
    expect(routeExists('/definitely-not-a-route')).toBe(false);
  });

  it('resolves a dynamic segment', () => {
    expect(routeExists('/explore/engineering')).toBe(true);
  });

  it('resolves a route inside a group', () => {
    // /login lives at app/(auth)/login — the group is not in the URL.
    expect(routeExists('/login')).toBe(true);
    expect(routeExists('/admin')).toBe(true);
  });

  it.each(CHROME_FILES)('%s has no dead links', (file) => {
    const dead = hrefsIn(file).filter((href) => !routeExists(href));
    expect(dead).toEqual([]);
  });

  it('/privacy specifically resolves', () => {
    // Named on its own because this is the one that was broken, and a
    // regression here would once again be invisible on every page.
    expect(routeExists('/privacy')).toBe(true);
  });
});
