'use server';

// Server Action behind the /admin/users edit form.
//
// requireAdmin() runs HERE, not only on the page that renders the form. A
// Server Action is a POST endpoint the moment it ships — anyone who can guess
// its id can invoke it, so gating the page alone would leave privilege
// escalation one crafted request away. This is the same reasoning that has
// every admin page.jsx re-check rather than trusting the layout.
import { revalidatePath } from 'next/cache';
import requireAdmin from '@/lib/auth/requireAdmin';
import { updateUserProfile } from '@/lib/admin/users';
import en from '@/lib/i18n/en';

const E = en.admin.users.errors;

export async function saveUserProfile(prevState, formData) {
  // Redirects to / for a non-admin; never returns for them.
  const actor = await requireAdmin();

  const id = String(formData.get('id') ?? '');
  const displayName = String(formData.get('displayName') ?? '');
  // An unchecked checkbox submits nothing at all, so absence means false —
  // but only when the form actually carried the control, which the hidden
  // companion field below records.
  const roleEditable = formData.get('roleEditable') === '1';
  const isAdmin = roleEditable ? formData.get('isAdmin') === 'on' : undefined;

  const result = await updateUserProfile({
    id,
    displayName,
    isAdmin,
    actorId: actor.id,
  });

  if (!result.ok) {
    return { error: E[result.reason] ?? E.failed, id };
  }

  // The list shows display name and role, so it has to re-read.
  revalidatePath('/admin/users');
  return { saved: true, id };
}
