// Pure gate for POST /api/account/delete — kept out of the route handler so
// it can be unit tested without a database, and so the exact rule ("the
// confirm field must equal this token, byte for byte") lives in one place
// shared by the client dialog's disabled-state check and the server's
// actual enforcement. The client-side check is a UX convenience only; this
// function is the trust boundary, called again inside the route handler.
export const DELETE_CONFIRM_TOKEN = 'DELETE';

/** True only for the exact confirmation string — no trimming, no case-folding. */
export function isDeleteConfirmed(value) {
  return value === DELETE_CONFIRM_TOKEN;
}
