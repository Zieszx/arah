// Single source of truth for the field <-> slug mapping used by /explore and
// /explore/[field]. `feature_spec.json`'s `classes` array is the model's own
// list of the ten field-of-study classes -- the same raw strings stored in
// alumni_profiles.field_of_study, field_stats.field_of_study and every
// prediction's `ranked[].field` (see lib/i18n/labels.js's header comment on
// why those raw strings, typos included, are load-bearing and must not be
// "fixed" at the source).
//
// Slugs are derived deterministically from the class name, not looked up
// from a database table or hand-maintained list, so this file is the one
// place a slug can ever be produced or resolved. Plan 5's admin needs the
// exact same mapping (to link from an admin field view back to the public
// /explore/[field] page) -- importing this module is how it stays in sync
// without a second copy of the derivation logic drifting from this one.
import featureSpec from '@/services/ml/feature_spec.json';

/**
 * Every class string carries a parenthetical detail --
 * "Business & Management (Accounting, Finance, Marketing etc)" -- that
 * exists for display, not identity. Stripping it before slugifying keeps
 * slugs short and stable even if the detail text is later reworded, and
 * incidentally means the one genuine survey typo ("Dentristry", inside the
 * Health & Medical Sciences parenthetical) never has a chance to end up in
 * a URL.
 */
function stripParenthetical(raw) {
  return raw.replace(/\s*\(.+?\)\s*$/, '').trim();
}

function slugify(raw) {
  return stripParenthetical(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `[{ raw, slug }]` for all ten fields, in feature_spec's own order. */
export const FIELDS = featureSpec.classes.map((raw) => ({
  raw,
  slug: slugify(raw),
}));

/** The raw `field_of_study` string for a URL slug, or null if unknown. */
export function getFieldRawBySlug(slug) {
  return FIELDS.find((f) => f.slug === slug)?.raw ?? null;
}

/** The URL slug for a raw `field_of_study` string, or null if unknown. */
export function getSlugForField(raw) {
  return FIELDS.find((f) => f.raw === raw)?.slug ?? null;
}
