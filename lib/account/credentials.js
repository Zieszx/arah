// Pure validation for the account credential changes. Framework-free so
// tests/js/account-credentials.test.js can exercise it directly, and so the
// Server Action and the form apply exactly the same rules — a client that
// promises something the server rejects is a worse bug than no validation.

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_DISPLAY_NAME = 80;

// Good-enough shape check; the same one app/(auth)/actions.js uses at signup,
// deliberately identical so an address that could be registered can also be
// changed to.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate a display-name change.
 * Blank is legitimate — it means "no display name" — so this only guards
 * length. Returns { ok, value } or { ok: false, field, code }.
 */
export function validateDisplayName(raw) {
  if (typeof raw !== 'string') return { ok: false, field: 'displayName', code: 'invalid' };
  const trimmed = raw.trim();
  if (trimmed.length > MAX_DISPLAY_NAME) {
    return { ok: false, field: 'displayName', code: 'nameTooLong' };
  }
  // Empty stored as null, so every reader's `?? fallback` keeps working.
  return { ok: true, value: trimmed === '' ? null : trimmed };
}

/**
 * Validate an email change.
 *
 * `current` is required so a no-op submit is reported as such rather than
 * sent to the auth provider, which would count against its rate limit for
 * nothing.
 */
export function validateEmailChange(raw, current) {
  if (typeof raw !== 'string') return { ok: false, field: 'email', code: 'emailRequired' };
  const email = raw.trim();
  if (!email) return { ok: false, field: 'email', code: 'emailRequired' };
  if (!EMAIL_RE.test(email)) return { ok: false, field: 'email', code: 'emailInvalid' };
  // Addresses are case-insensitive in practice; treat a case-only edit as no
  // change rather than as a new address.
  if (typeof current === 'string' && email.toLowerCase() === current.trim().toLowerCase()) {
    return { ok: false, field: 'email', code: 'emailUnchanged' };
  }
  return { ok: true, value: email };
}

/**
 * Validate a password change.
 *
 * `currentPassword` is mandatory and is checked against the auth provider by
 * the caller before anything is written. Without it, anyone who found an
 * unattended signed-in browser could lock the real owner out of their account
 * in two clicks — a session alone must never be enough to change the
 * credential that session was created with.
 */
export function validatePasswordChange({ currentPassword, password, confirm }) {
  if (typeof currentPassword !== 'string' || currentPassword === '') {
    return { ok: false, field: 'currentPassword', code: 'currentPasswordRequired' };
  }
  if (typeof password !== 'string' || password === '') {
    return { ok: false, field: 'password', code: 'passwordRequired' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, field: 'password', code: 'passwordTooShort' };
  }
  if (password === currentPassword) {
    return { ok: false, field: 'password', code: 'passwordUnchanged' };
  }
  if (confirm !== password) {
    return { ok: false, field: 'confirm', code: 'confirmMismatch' };
  }
  return { ok: true, value: password };
}
