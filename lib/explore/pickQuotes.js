// Deterministic quote selection for /explore/[field]. advice_quotes (0007
// migration) returns advice text with no field attached BY DESIGN — see
// that migration's header comment and components/explore/AdviceQuotes.jsx.
// This module must never be handed field data to filter by; it only ever
// picks a stable-looking subset of the whole cohort's quotes, keyed off the
// field's own slug so different field pages surface a different slice of
// the same shared pool without the selection changing on every request
// (Math.random() would make screenshots and any future test flaky, and
// gives no benefit here — nothing about which quote a viewer sees needs to
// vary request to request).
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (Math.imul(h, 31) + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** `n` quotes from `quotes`, deterministically chosen from `seed`. */
export function pickQuotes(quotes, seed, n = 3) {
  if (!Array.isArray(quotes) || quotes.length === 0) return [];
  const count = Math.min(n, quotes.length);
  const start = hashString(String(seed)) % quotes.length;
  const picked = [];
  for (let i = 0; i < count; i += 1) {
    picked.push(quotes[(start + i) % quotes.length]);
  }
  return picked;
}
