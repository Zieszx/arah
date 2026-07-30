'use server';

// Server Actions for the account settings: display name, email, password.
//
// Every one of these re-reads the session with getUser() rather than trusting
// anything the form sent. A Server Action is a POST endpoint the moment it
// ships, so the id it operates on must come from the verified session, never
// from a hidden field — otherwise one signed-in student could change another
// student's credentials by editing the form.
//
// Changing an email or a password additionally requires the CURRENT password,
// re-checked against the auth provider before anything is written. A live
// session is not sufficient authority to change the credential that created
// it: without this, an unattended signed-in browser is an account takeover in
// two clicks.
//
// Password reset-by-email is deliberately absent. This project sends no email
// at all (see app/(auth)/actions.js's signup comment — accounts are created
// pre-confirmed precisely to avoid depending on mail delivery), so a "forgot
// password" link would be a promise the system cannot keep. Changing a
// password requires knowing the current one.
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  validateDisplayName,
  validateEmailChange,
  validatePasswordChange,
} from '@/lib/account/credentials';
import en from '@/lib/i18n/en';

const E = en.account.settings.errors;

function fail(field, code) {
  return { fieldErrors: { [field]: E[code] ?? E.generic } };
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Confirm the person at the keyboard knows the current password.
 *
 * signInWithPassword on the user's own address is the check: it succeeds only
 * for the right password, and re-issues the same session rather than
 * disturbing it. A wrong password returns an error and nothing is written.
 */
async function reauthenticate(supabase, email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

export async function updateDisplayName(prevState, formData) {
  const { supabase, user } = await requireUser();
  if (!user) return fail('form', 'signedOut');

  const result = validateDisplayName(formData.get('displayName'));
  if (!result.ok) return fail(result.field, result.code);

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: result.value })
    .eq('id', user.id);
  if (error) {
    console.error('account: display name update failed:', error.code);
    return fail('form', 'generic');
  }

  revalidatePath('/account');
  return { saved: 'displayName' };
}

export async function updateEmail(prevState, formData) {
  const { supabase, user } = await requireUser();
  if (!user) return fail('form', 'signedOut');

  const result = validateEmailChange(formData.get('email'), user.email);
  if (!result.ok) return fail(result.field, result.code);

  const currentPassword = String(formData.get('currentPassword') ?? '');
  if (!currentPassword) return fail('currentPassword', 'currentPasswordRequired');
  if (!(await reauthenticate(supabase, user.email, currentPassword))) {
    return fail('currentPassword', 'currentPasswordWrong');
  }

  // Written through the admin client with email_confirm, for the same reason
  // signup does: the project sends no mail, so waiting on a confirmation link
  // would strand the change forever. The address is an identifier here and
  // nothing is ever sent to it — which is exactly what the form says, so
  // nobody is misled into treating it as a verified contact address.
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      email: result.value,
      email_confirm: true,
    });
    if (error) {
      // The one case worth naming: the address already belongs to someone.
      if (error.code === 'email_exists' || error.code === 'user_already_exists') {
        return fail('email', 'emailTaken');
      }
      console.error('account: email update failed:', error.code);
      return fail('form', 'generic');
    }
  } catch (err) {
    console.error('account: email update threw:', err?.code ?? err?.message);
    return fail('form', 'generic');
  }

  revalidatePath('/account');
  return { saved: 'email' };
}

export async function updatePassword(prevState, formData) {
  const { supabase, user } = await requireUser();
  if (!user) return fail('form', 'signedOut');

  const currentPassword = String(formData.get('currentPassword') ?? '');
  const result = validatePasswordChange({
    currentPassword,
    password: String(formData.get('password') ?? ''),
    confirm: String(formData.get('confirm') ?? ''),
  });
  if (!result.ok) return fail(result.field, result.code);

  if (!(await reauthenticate(supabase, user.email, currentPassword))) {
    return fail('currentPassword', 'currentPasswordWrong');
  }

  // updateUser, not the admin client: this runs as the user, so Supabase
  // keeps the current session valid rather than invalidating it and dropping
  // them onto the login page mid-task.
  const { error } = await supabase.auth.updateUser({ password: result.value });
  if (error) {
    if (error.code === 'weak_password') return fail('password', 'weakPassword');
    if (error.code === 'same_password') return fail('password', 'passwordUnchanged');
    console.error('account: password update failed:', error.code);
    return fail('form', 'generic');
  }

  return { saved: 'password' };
}
