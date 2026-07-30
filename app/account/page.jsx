// /account — a Server Component listing the signed-in student's past
// quizzes, newest first, plus the "delete everything" control that makes
// the signup page's promise true (lib/i18n/en.js auth.notice.body: "You
// can delete everything from your account page at any time.").
//
// Access control mirrors /results/[id]: proxy.js redirects unauthenticated
// navigation optimistically, and this page re-checks the session
// server-side (node_modules/next/dist/docs/01-app/02-guides/authentication.md,
// "Optimistic checks with Proxy" — a cookie-based redirect is not the last
// line of defence). Every read below goes through the request-scoped,
// RLS-bound client, so this page can only ever see the signed-in student's
// own rows.
//
// The orphan case — a quiz_responses row whose prediction never completed
// because the ML service was down — is real and was proven during Task 4
// testing. lib/account/history.js pairs each response with its prediction
// (or lack of one) and OrphanCard renders that state honestly, with a
// retry, rather than as a broken or silently missing row.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  fetchPredictionsForUser,
  fetchQuizResponsesForUser,
} from '@/lib/supabase/queries';
import { buildQuizHistory } from '@/lib/account/history';
import { displayLabel } from '@/lib/i18n/labels';
import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';
import Link from 'next/link';
import Kicker from '@/components/arah/Kicker.jsx';
import FlowButton from '@/components/arah/FlowButton.jsx';
import { Card } from '@/components/ui/card';
import StaggerReveal from '@/components/motion/StaggerReveal.jsx';
import OrphanCard from '@/components/account/OrphanCard.jsx';
import DeleteAccountSection from '@/components/account/DeleteAccountSection.jsx';
import AccountSettings from '@/components/account/AccountSettings.jsx';
import { updateDisplayName, updateEmail, updatePassword } from './actions';

export const metadata = {
  title: en.account.metaTitle,
  description: en.account.metaDescription,
  // Personal history and account controls must never end up in a search
  // index — the same rule /results/[id] follows.
  robots: { index: false, follow: false },
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatDate(iso) {
  const d = new Date(iso ?? '');
  return Number.isNaN(d.getTime()) ? '' : DATE_FORMAT.format(d);
}

const viewResultsClass = cn(
  'mt-5 inline-flex min-h-11 w-fit items-center rounded-full border border-hairline px-5',
  'text-sm text-text/90 transition-colors duration-200',
  'hover:border-violet-lt/50 hover:bg-surface-2 hover:text-violet-lt active:bg-surface-2 active:text-violet-pl',
  // No `outline-none` — see components/arah/FlowButton.jsx for why that
  // utility would silently defeat this ring under Tailwind v4.
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt'
);

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent('/account')}`);
  }

  const [responses, predictions, profileResult] = await Promise.all([
    fetchQuizResponsesForUser(supabase, user.id),
    fetchPredictionsForUser(supabase, user.id),
    // RLS scopes this to the caller's own row, so no id filter is load-bearing
    // here — but it is written explicitly anyway rather than relying on the
    // policy to be the only thing standing between accounts.
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
  ]);
  const history = buildQuizHistory(responses, predictions);
  // A missing profiles row is not an error: the settings form just starts
  // blank, and saving a name creates it.
  const profile = profileResult?.data ?? null;

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 py-8 md:px-16 md:py-12">
      <section className="mt-6 max-w-[860px] md:mt-10">
        <Kicker>{en.account.kicker}</Kicker>
        <h1 className="font-display mt-3 text-[42px] leading-[1.08] md:text-[56px]">
          {en.account.title}
        </h1>
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          {en.account.signedInAs} {user.email}
        </p>
      </section>

      <section className="mt-14 max-w-[860px] md:mt-20">
        {history.length === 0 ? (
          <div className="rounded-2xl border border-hairline bg-surface p-8 md:p-10">
            <p className="font-display text-[24px] md:text-[30px]">
              {en.account.empty.title}
            </p>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.6] text-muted-foreground">
              {en.account.empty.body}
            </p>
            <FlowButton href="/questions" className="mt-7 w-fit">
              {en.account.empty.cta}
            </FlowButton>
          </div>
        ) : (
          <StaggerReveal className="flex flex-col gap-4 md:gap-5">
            {history.map((item) =>
              item.prediction ? (
                <Card
                  key={item.quizResponseId}
                  className="gap-0 bg-surface p-6 md:p-8"
                >
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </p>
                  <p className="mt-4 text-[13px] font-medium text-violet-lt">
                    {item.prediction.marginalised
                      ? en.account.item.marginalised
                      : en.account.item.matched}
                  </p>
                  <p className="font-display mt-1 text-[24px] leading-[1.15] md:text-[28px]">
                    {displayLabel(item.prediction.topField)}
                  </p>
                  <Link
                    href={`/results/${item.prediction.id}`}
                    className={viewResultsClass}
                  >
                    {en.account.item.viewResults}
                  </Link>
                </Card>
              ) : (
                <OrphanCard
                  key={item.quizResponseId}
                  answers={item.answers}
                  dateLabel={formatDate(item.createdAt)}
                />
              )
            )}
          </StaggerReveal>
        )}
      </section>

      <section className="mt-16 max-w-[860px] md:mt-24">
        <h2 className="font-display text-[30px] leading-[1.15] md:text-[38px]">
          {en.account.settings.heading}
        </h2>
        <div className="mt-7">
          <AccountSettings
            email={user.email}
            displayName={profile?.display_name ?? null}
            updateDisplayNameAction={updateDisplayName}
            updateEmailAction={updateEmail}
            updatePasswordAction={updatePassword}
          />
        </div>
      </section>

      <div className="mt-16 max-w-[860px] md:mt-24">
        <DeleteAccountSection />
      </div>
    </main>
  );
}
