// /login — Server Component. Reads ?next= (searchParams is a Promise in
// Next 16 — node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md)
// and threads it through the form so a student bounced here from /quiz
// lands back on /quiz after signing in. The value is validated again
// server-side in the action; here it only has to be a same-origin path so
// the signup cross-link can carry it too.
import Kicker from '@/components/arah/Kicker.jsx';
import en from '@/lib/i18n/en';
import LoginForm from './login-form.jsx';
import { SwitchLink } from '../form-controls.jsx';

export const metadata = {
  title: en.auth.login.metaTitle,
  description: en.auth.login.metaDescription,
};

function sameOriginPath(raw) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return '';
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '';
  }
  return value;
}

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const next = sameOriginPath(params?.next);
  const t = en.auth.login;
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : '/signup';

  return (
    <>
      <Kicker>{t.kicker}</Kicker>
      <h1 className="font-display mt-5 max-w-[18ch] text-[30px] leading-[1.08] md:text-[42px]">
        {t.title}
      </h1>
      <p className="mt-4 max-w-[40ch] text-[15px] text-muted-foreground md:text-base">
        {t.subtitle}
      </p>

      <LoginForm next={next} className="mt-10 flex w-full max-w-[420px] flex-col gap-6" />

      <p className="mt-9 text-[13px] text-muted-foreground">
        {t.switchPrompt} <SwitchLink href={signupHref}>{t.switchCta}</SwitchLink>
      </p>
    </>
  );
}
