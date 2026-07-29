// Shared shape-check for a stored `predictions.results.ranked` entry.
//
// Extracted from app/results/[id]/page.jsx so /account can apply the exact
// same "is this row honestly renderable" test when deciding whether a
// quiz_responses row has a real, displayable prediction or is an orphan
// (answers saved, but the row's prediction never completed or was stored
// malformed) — the two pages must never disagree about what counts as a
// usable result.
export function isRenderableEntry(entry) {
  return (
    entry &&
    typeof entry.field === 'string' &&
    entry.field !== '' &&
    typeof entry.probability === 'number' &&
    Number.isFinite(entry.probability)
  );
}

/** The best-ranked renderable entry from a stored results row, or null. */
export function topRenderableEntry(results) {
  const ranked = Array.isArray(results?.ranked)
    ? results.ranked.filter(isRenderableEntry)
    : [];
  return ranked[0] ?? null;
}
