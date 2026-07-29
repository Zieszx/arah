// /signup — a real, addressable route, kept purely so this URL has its own
// <title>/<meta description> (Next.js resolves `metadata` per route
// segment independent of what that segment actually renders). The visible
// UI — both forms, the sliding panel — lives in the shared (auth) layout's
// AuthShell, which stays mounted across client-side navigation to/from
// /login; see app/(auth)/layout.jsx's module doc for why. This page
// therefore renders nothing itself.
import en from '@/lib/i18n/en';

export const metadata = {
  title: en.auth.signup.metaTitle,
  description: en.auth.signup.metaDescription,
};

export default function SignupPage() {
  return null;
}
