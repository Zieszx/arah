// /signup — Server Component shell around the client form. Carries ?next=
// the same way /login does, so the login ↔ signup cross-links never lose
// the page the student was originally headed to.
import Kicker from '@/components/arah/Kicker.jsx';
import en from '@/lib/i18n/en';
import SignupForm from './signup-form.jsx';
import { SwitchLink } from '../form-controls.jsx';

export const metadata = {
  title: en.auth.signup.metaTitle,
  description: en.auth.signup.metaDescription,
};

function sameOriginPath(raw) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return '';
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '';
  }
  return value;
}

export default async function SignupPage({ searchParams }) {
  const params = await searchParams;
  const next = sameOriginPath(params?.next);
  const t = en.auth.signup;
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  return (
    <>
      <Kicker>{t.kicker}</Kicker>
      <h1 className="font-display mt-5 max-w-[18ch] text-[30px] leading-[1.08] md:text-[42px]">
        {t.title}
      </h1>
      <p className="mt-4 max-w-[40ch] text-[15px] text-muted-foreground md:text-base">
        {t.subtitle}
      </p>

      <SignupForm next={next} className="mt-10 flex w-full max-w-[420px] flex-col gap-6" />

      <p className="mt-9 text-[13px] text-muted-foreground">
        {t.switchPrompt} <SwitchLink href={loginHref}>{t.switchCta}</SwitchLink>
      </p>
    </>
  );
}
