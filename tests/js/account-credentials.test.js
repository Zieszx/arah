// Validation rules behind the account settings forms.
//
// These matter more than most validation: they guard the credentials
// themselves. The rule with real teeth is that a password change always needs
// the CURRENT password — a live session must not be sufficient authority to
// change the credential that created it, or an unattended signed-in browser
// is an account takeover in two clicks.
import { describe, it, expect } from 'vitest';
import {
  validateDisplayName,
  validateEmailChange,
  validatePasswordChange,
  MIN_PASSWORD_LENGTH,
  MAX_DISPLAY_NAME,
} from '@/lib/account/credentials';

describe('validateDisplayName', () => {
  it('accepts an ordinary name, trimmed', () => {
    expect(validateDisplayName('  Nuha  ')).toEqual({ ok: true, value: 'Nuha' });
  });

  it('treats blank as "no display name", stored as null', () => {
    // Not '': every reader falls back with `?? 'No display name set'`, which
    // an empty string would defeat.
    expect(validateDisplayName('')).toEqual({ ok: true, value: null });
    expect(validateDisplayName('   ')).toEqual({ ok: true, value: null });
  });

  it('rejects a name past the column limit', () => {
    const long = 'x'.repeat(MAX_DISPLAY_NAME + 1);
    expect(validateDisplayName(long)).toMatchObject({ ok: false, code: 'nameTooLong' });
  });

  it('accepts exactly the limit', () => {
    const exact = 'x'.repeat(MAX_DISPLAY_NAME);
    expect(validateDisplayName(exact)).toEqual({ ok: true, value: exact });
  });

  it('rejects a non-string rather than coercing it', () => {
    expect(validateDisplayName(null)).toMatchObject({ ok: false });
    expect(validateDisplayName(42)).toMatchObject({ ok: false });
  });
});

describe('validateEmailChange', () => {
  it('accepts a different, well-formed address', () => {
    expect(validateEmailChange('new@arah.app', 'old@arah.app')).toEqual({
      ok: true,
      value: 'new@arah.app',
    });
  });

  it('rejects an empty or malformed address', () => {
    expect(validateEmailChange('', 'a@b.com')).toMatchObject({ code: 'emailRequired' });
    expect(validateEmailChange('not-an-email', 'a@b.com')).toMatchObject({
      code: 'emailInvalid',
    });
    expect(validateEmailChange('a@b', 'x@y.com')).toMatchObject({ code: 'emailInvalid' });
  });

  it('reports a no-op instead of spending a rate-limited call on it', () => {
    expect(validateEmailChange('a@b.com', 'a@b.com')).toMatchObject({
      code: 'emailUnchanged',
    });
  });

  it('treats a case-only edit as no change', () => {
    // Addresses are case-insensitive in practice, so "A@B.com" is the same
    // account — submitting it should not look like a successful change.
    expect(validateEmailChange('A@B.COM', 'a@b.com')).toMatchObject({
      code: 'emailUnchanged',
    });
  });

  it('trims before comparing, so whitespace is not a "change"', () => {
    expect(validateEmailChange('  a@b.com  ', 'a@b.com')).toMatchObject({
      code: 'emailUnchanged',
    });
  });
});

describe('validatePasswordChange', () => {
  const good = {
    currentPassword: 'OldPass123',
    password: 'NewPass456',
    confirm: 'NewPass456',
  };

  it('accepts a valid change', () => {
    expect(validatePasswordChange(good)).toEqual({ ok: true, value: 'NewPass456' });
  });

  it('ALWAYS requires the current password', () => {
    // The guard that matters. A session alone must never be enough.
    expect(validatePasswordChange({ ...good, currentPassword: '' })).toMatchObject({
      field: 'currentPassword',
      code: 'currentPasswordRequired',
    });
    expect(
      validatePasswordChange({ ...good, currentPassword: undefined })
    ).toMatchObject({ field: 'currentPassword' });
    expect(validatePasswordChange({ ...good, currentPassword: null })).toMatchObject({
      field: 'currentPassword',
    });
  });

  it('checks the current password BEFORE anything else', () => {
    // Otherwise an attacker learns which of their guesses were well-formed
    // passwords before being told they had no authority to set one.
    const everythingWrong = { currentPassword: '', password: 'x', confirm: 'y' };
    expect(validatePasswordChange(everythingWrong)).toMatchObject({
      field: 'currentPassword',
    });
  });

  it('enforces the minimum length', () => {
    const short = 'x'.repeat(MIN_PASSWORD_LENGTH - 1);
    expect(
      validatePasswordChange({ ...good, password: short, confirm: short })
    ).toMatchObject({ field: 'password', code: 'passwordTooShort' });
  });

  it('refuses a new password identical to the current one', () => {
    expect(
      validatePasswordChange({
        currentPassword: 'SamePass123',
        password: 'SamePass123',
        confirm: 'SamePass123',
      })
    ).toMatchObject({ code: 'passwordUnchanged' });
  });

  it('requires the confirmation to match exactly', () => {
    expect(
      validatePasswordChange({ ...good, confirm: 'NewPass456 ' })
    ).toMatchObject({ field: 'confirm', code: 'confirmMismatch' });
    expect(validatePasswordChange({ ...good, confirm: 'newpass456' })).toMatchObject({
      field: 'confirm',
    });
  });

  it('does not trim the password — a trailing space is part of it', () => {
    const withSpace = 'NewPass456 ';
    expect(
      validatePasswordChange({ ...good, password: withSpace, confirm: withSpace })
    ).toEqual({ ok: true, value: withSpace });
  });
});
