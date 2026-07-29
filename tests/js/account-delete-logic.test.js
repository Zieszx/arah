// Pure gate behind POST /api/account/delete (lib/account/delete.js). This
// is the trust boundary: the client dialog's disabled state and the
// server's actual enforcement both call this same function, so they can
// never disagree about what counts as a confirmed deletion.
import { describe, it, expect } from 'vitest';
import { DELETE_CONFIRM_TOKEN, isDeleteConfirmed } from '@/lib/account/delete.js';

describe('isDeleteConfirmed', () => {
  it('accepts only the exact token', () => {
    expect(isDeleteConfirmed('DELETE')).toBe(true);
    expect(DELETE_CONFIRM_TOKEN).toBe('DELETE');
  });

  it('rejects case variants — a deliberate, not a casual, confirmation', () => {
    expect(isDeleteConfirmed('delete')).toBe(false);
    expect(isDeleteConfirmed('Delete')).toBe(false);
    expect(isDeleteConfirmed('DELETE ')).toBe(false);
    expect(isDeleteConfirmed(' DELETE')).toBe(false);
  });

  it('rejects everything empty, missing or garbage', () => {
    for (const junk of ['', null, undefined, 0, false, {}, [], 'yes', 'confirm']) {
      expect(isDeleteConfirmed(junk)).toBe(false);
    }
  });
});
