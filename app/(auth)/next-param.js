// Shared `?next=` sanitizer for the auth routes.
//
// The value is attacker-controllable (it's a URL parameter), so it must
// collapse to a safe, same-origin path before it's used anywhere: an
// absolute URL, a protocol-relative "//evil.com", or a backslash trick must
// never survive. This mirrors safeNext() in app/(auth)/actions.js, which is
// the *authoritative* check that runs again server-side, inside the Server
// Action, before any redirect() actually happens. This copy exists so the
// UI itself — the hidden form field, the panel's switch links — never even
// constructs a URL around an unsafe value in the first place.
export function sameOriginPath(raw) {
  if (typeof raw !== 'string') return '';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return '';
  }
  return raw;
}
