// /login — a real, addressable route, kept purely so this URL has its own
// <title>/<meta description>. The visible UI lives in the shared (auth)
// layout's AuthShell — see app/(auth)/signup/page.jsx and
// app/(auth)/layout.jsx for the full explanation. This page therefore
// renders nothing itself.
import en from '@/lib/i18n/en';

export const metadata = {
  title: en.auth.login.metaTitle,
  description: en.auth.login.metaDescription,
};

export default function LoginPage() {
  return null;
}
