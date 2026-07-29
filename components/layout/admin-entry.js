// The footer's admin-entry decision, as a pure function so the security
// matrix is unit-testable without a browser or a database.
//
// | viewer                       | result                       |
// |------------------------------|------------------------------|
// | signed out                   | '/login?next=/admin'         |
// | signed in, is_admin = true   | '/admin'                     |
// | signed in, ordinary student  | null — render NOTHING        |
//
// The third row is a security requirement, not styling: for a signed-in
// non-admin the element must be absent from the served HTML entirely.
// `display: none` or `hidden` would still ship the markup, and anyone who
// opens devtools would learn an admin area exists and where it lives.
// SiteFooter (a Server Component) calls this before serialisation and
// simply does not render the node when this returns null — verified
// end-to-end by tests/js/admin-absence.test.js, which asserts the served
// document for a signed-in student contains no '/admin' substring at all.
export function adminEntryHref({ signedIn, isAdmin }) {
  if (!signedIn) return '/login?next=/admin';
  return isAdmin ? '/admin' : null;
}
