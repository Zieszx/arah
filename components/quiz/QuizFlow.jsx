'use client';

// The quiz shell: header (logotype + progress ring), the animated
// question area, and the persistent Back / Next / Submit row.
//
// Question transitions run through Motion but are gated on
// useMotionCapability(): reduced-motion users get an instant swap with no
// movement. The hook flips `enabled` after mount, so — hook-order rule —
// every hook here runs unconditionally before any conditional rendering.
//
// Submission POSTs to /api/quiz (built in Task 4). Until that route
// exists the POST 404s; the catch below turns any failure — network, 4xx,
// 5xx, bad JSON — into a calm inline message, and the answers stay in
// state and in localStorage, so nothing is ever lost to a failed submit.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import FlowButton from '@/components/arah/FlowButton.jsx';
import ProgressRing from './ProgressRing.jsx';
import QuestionCard from './QuestionCard.jsx';
import { useQuizState } from '@/lib/quiz/useQuizState';
import { useMotionCapability } from '@/lib/motion/useReducedMotion';
import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';

const variants = {
  enter: (direction) => ({ opacity: 0, x: 28 * direction }),
  center: { opacity: 1, x: 0 },
  exit: (direction) => ({ opacity: 0, x: -28 * direction }),
};

export default function QuizFlow() {
  const quiz = useQuizState();
  const { enabled } = useMotionCapability();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  // Focus moves to the question only on *navigation*, never on first
  // mount — stealing focus on page load is hostile to everyone. Flipped
  // in the navigation event handlers themselves, not in an effect.
  const [hasNavigated, setHasNavigated] = useState(false);

  async function handleSubmit() {
    const result = quiz.validate();
    if (!result.ok) {
      // Shouldn't happen (Next gates each required question), but if the
      // payload is somehow incomplete, take the student to the first gap
      // rather than showing a dead error.
      const firstBad = quiz.groups.findIndex((g) => result.errors[g.key]);
      if (firstBad >= 0) {
        setHasNavigated(true);
        quiz.goTo(firstBad);
      }
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: quiz.payload() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.id) throw new Error('Malformed response');
      quiz.clearSaved();
      router.push(`/results/${encodeURIComponent(data.id)}`);
      // Deliberately stay in the submitting state while the redirect
      // happens — no flash back to an idle button.
    } catch {
      setSubmitError(en.quiz.submitError);
      setSubmitting(false);
    }
  }

  function handleNext() {
    setSubmitError(null);
    if (quiz.isLast) {
      // The optional last question never blocks; go straight to submit.
      handleSubmit();
    } else if (quiz.next()) {
      setHasNavigated(true);
    }
  }

  function handleBack() {
    setSubmitError(null);
    setHasNavigated(true);
    quiz.back();
  }

  const transition = enabled
    ? { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
    : { duration: 0 };

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 py-8 md:px-16 md:py-12">
      <header className="flex items-center justify-between gap-6">
        <Link
          href="/"
          className="font-display inline-flex min-h-11 w-fit items-center text-lg uppercase text-text/90 focus-visible:outline-2 focus-visible:outline-offset-2 md:text-xl"
          style={{ letterSpacing: '0.20em' }}
        >
          ARAH
        </Link>
        {quiz.ready ? (
          <ProgressRing step={quiz.step} total={quiz.total} />
        ) : null}
      </header>

      {/* Polite live region: announces the current step to screen readers
          on every navigation without interrupting mid-sentence. */}
      <p aria-live="polite" className="sr-only">
        {quiz.ready && quiz.group
          ? `${en.quiz.progressLabel} ${quiz.step + 1} ${en.quiz.of} ${quiz.total} — ${quiz.group.label}`
          : ''}
      </p>

      <div className="mx-auto mt-10 w-full max-w-[760px] flex-1 md:mt-16">
        {quiz.ready && quiz.group ? (
          <>
            <div className="relative overflow-x-clip">
              <AnimatePresence mode="wait" initial={false} custom={quiz.direction}>
                <motion.div
                  key={quiz.group.key}
                  custom={quiz.direction}
                  variants={variants}
                  initial={enabled ? 'enter' : false}
                  animate="center"
                  exit={enabled ? 'exit' : undefined}
                  transition={transition}
                >
                  <QuestionCard
                    group={quiz.group}
                    value={quiz.answers[quiz.group.key]}
                    atLimit={quiz.atLimit(quiz.group)}
                    limitNotice={quiz.limitNotice}
                    stepError={quiz.stepError}
                    choose={quiz.choose}
                    toggle={quiz.toggle}
                    setNumber={quiz.setNumber}
                    focusOnMount={hasNavigated}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4 pb-8 md:mt-12">
              <button
                type="button"
                onClick={handleBack}
                disabled={quiz.step === 0 || submitting}
                className={cn(
                  'inline-flex min-h-12 items-center justify-center rounded-full border border-hairline px-7',
                  'text-sm font-semibold text-text/90 transition-colors duration-200',
                  'hover:border-text/25 hover:bg-surface-2',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt',
                  'disabled:pointer-events-none disabled:opacity-40'
                )}
              >
                {en.quiz.back}
              </button>
              <FlowButton
                onClick={handleNext}
                disabled={submitting}
                aria-busy={submitting || undefined}
                className="min-h-12"
              >
                {quiz.isLast
                  ? submitting
                    ? en.quiz.submitting
                    : en.quiz.submit
                  : en.quiz.next}
              </FlowButton>
            </div>

            {submitError ? (
              <p role="alert" className="-mt-4 max-w-[52ch] pb-8 text-[13px] leading-[1.5] text-danger">
                {submitError}
              </p>
            ) : null}
          </>
        ) : (
          // Held until the localStorage restore has run, so a returning
          // student never sees question 1 flash before their real position.
          <div aria-hidden="true" className="min-h-[420px]" />
        )}
      </div>
    </main>
  );
}
