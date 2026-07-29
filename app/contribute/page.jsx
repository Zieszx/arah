// /contribute — the give-back loop (Plan 4, Task 4). A Server Component
// shell around the client form: it decides whether to show the form at
// all, everything interactive lives in ContributeForm.jsx.
//
// Deliberately NOT in proxy.js's PROTECTED_PREFIXES (proxy.js only guards
// /questions, /results, /account, /admin): the page itself is browsable signed
// out, so a student can read the honest ask before deciding whether to
// sign in, rather than being redirected away from a page they haven't
// even seen yet. Submission still requires auth — app/api/contribute/route.js
// is its own gate — this page just chooses the friendlier failure mode
// (a sign-in prompt in place of the form) over losing a half-filled form
// to a 401 the student never expected.
import { createClient } from '@/lib/supabase/server';
import Kicker from '@/components/arah/Kicker.jsx';
import FlowButton from '@/components/arah/FlowButton.jsx';
import ContributeForm from '@/components/contribute/ContributeForm.jsx';
import en from '@/lib/i18n/en';

export const metadata = {
  title: en.contribute.metaTitle,
  description: en.contribute.metaDescription,
};

export default async function ContributePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 py-14 md:px-16 md:py-20">
      <section className="max-w-[640px]">
        <Kicker>{en.contribute.kicker}</Kicker>
        <h1 className="font-display mt-6 max-w-[16ch] text-balance text-[42px] leading-[1.08] md:text-[56px]">
          {en.contribute.title}
        </h1>
        <p className="mt-6 max-w-[62ch] text-[15px] leading-[1.6] text-muted-foreground md:text-base">
          {en.contribute.body}
        </p>
      </section>

      <section className="mt-12 md:mt-16">
        {user ? (
          <ContributeForm />
        ) : (
          <div className="max-w-[520px] rounded-2xl border border-hairline bg-surface p-6 md:p-8">
            <h2 className="font-display text-[24px] md:text-[28px]">
              {en.contribute.signInPrompt.title}
            </h2>
            <p className="mt-4 text-[15px] leading-[1.6] text-muted-foreground">
              {en.contribute.signInPrompt.body}
            </p>
            <FlowButton
              href={`/login?next=${encodeURIComponent('/contribute')}`}
              className="mt-7 w-fit"
            >
              {en.contribute.signInPrompt.cta}
            </FlowButton>
          </div>
        )}
      </section>
    </main>
  );
}
