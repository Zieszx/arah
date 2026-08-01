// Display labels for raw spec values — presentation only, never data.
//
// The 2025 survey contains a couple of genuine spelling errors
// ("Resiliant", "Dentristry") that the ensemble was *trained on*. The
// strings in services/ml/feature_spec.json are therefore load-bearing:
// the encoder, the parity fixtures and the model all expect them
// byte-for-byte, and correcting them at the source would silently break
// every prediction. This module fixes them at the last moment before a
// human reads them, and nowhere else.
//
// Direction is one-way by construction: raw value in, display label out.
// Nothing may ever feed a display label back toward the model — inputs
// keep raw spec strings as their `value`, payloads are built from raw
// values, and tests/js/labels.test.js pins both directions (the corrected
// spellings are *rejected* by validateAnswers and encode to zeroes).
//
// Keep this map tiny and explicit: genuine errors only, no restyling.
const CORRECTIONS = {
  // trait option — survey typo
  Resiliant: 'Resilient',
  // field-of-study class — survey typo
  'Health & Medical Sciences (Medicine, Pharmacy, Dentristry etc)':
    'Health & Medical Sciences (Medicine, Pharmacy, Dentistry etc)',
  // school option — survey typo
  'Religous School (Sekolah Agama)': 'Religious School (Sekolah Agama)',
};

/**
 * Human-friendly label for a raw spec value. Unknown values fall through
 * unchanged — this is a spelling fix, not a translation layer.
 */
export function displayLabel(rawValue) {
  if (typeof rawValue !== 'string') return rawValue;
  return Object.prototype.hasOwnProperty.call(CORRECTIONS, rawValue)
    ? CORRECTIONS[rawValue]
    : rawValue;
}

/** Exposed for the test that pins every key to a live spec string. */
export function correctionEntries() {
  return Object.entries(CORRECTIONS);
}
