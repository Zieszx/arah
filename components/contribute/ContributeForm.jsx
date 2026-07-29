'use client';

// The Contribute form (Plan 4, Task 4) — a single continuous scroll, not a
// step wizard: unlike the quiz, nothing here is time-pressured or
// abandoned mid-flow for a marginalised prediction, so there is no reason
// to hide 12 of 13 questions behind Next/Back. It renders the exact same
// ten predictive questions the quiz asks (lib/quiz/useQuizState.js's
// orderedGroups(), the single source of question order/sectioning) plus
// three outcome questions (lib/contribute/submission.js#outcomeGroups) —
// all thirteen through the SAME QuestionCard/OptionGrid components the
// quiz uses, never a re-implementation, so a fix to how a checkbox or a
// numeric scale behaves only ever needs to happen once.
//
// preu is rendered with `optional: false` here even though
// feature_spec.json marks it optional for the quiz's marginalisation
// feature — see lib/contribute/submission.js's doc comment on
// validateContribution. QuestionCard/OptionGrid both key off that
// per-render override (not the shared spec object, never mutated) to
// suppress the "not sure yet" affordance and its "fine not to know yet"
// helper text.
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Kicker from '@/components/arah/Kicker.jsx';
import FlowButton from '@/components/arah/FlowButton.jsx';
import StaggerReveal from '@/components/motion/StaggerReveal.jsx';
import QuestionCard from '@/components/quiz/QuestionCard.jsx';
import { orderedGroups } from '@/lib/quiz/useQuizState';
import {
  ADVICE_MAX_LENGTH,
  ADVICE_MIN_LENGTH,
  cleanContribution,
  outcomeGroups,
  validateContribution,
} from '@/lib/contribute/submission';
import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';

function useContributeAnswers() {
  const [answers, setAnswers] = useState({});
  const [limitNotices, setLimitNotices] = useState({});

  const choose = useCallback((group, option) => {
    setLimitNotices((prev) => (prev[group.key] ? { ...prev, [group.key]: null } : prev));
    setAnswers((prev) => ({ ...prev, [group.key]: option }));
  }, []);

  const setNumber = useCallback((group, n) => {
    setLimitNotices((prev) => (prev[group.key] ? { ...prev, [group.key]: null } : prev));
    const clamped = Math.min(Math.max(n, group.min), group.max);
    setAnswers((prev) => ({ ...prev, [group.key]: clamped }));
  }, []);

  const toggle = useCallback(
    (group, option) => {
      const current = Array.isArray(answers[group.key]) ? answers[group.key] : [];
      if (!current.includes(option) && group.max_select && current.length >= group.max_select) {
        setLimitNotices((prev) => ({
          ...prev,
          [group.key]: `${en.quiz.overLimitLead} ${group.max_select}. ${en.quiz.overLimitTail}`,
        }));
        return;
      }
      setLimitNotices((prev) => (prev[group.key] ? { ...prev, [group.key]: null } : prev));
      setAnswers((prev) => {
        const list = Array.isArray(prev[group.key]) ? prev[group.key] : [];
        if (list.includes(option)) {
          return { ...prev, [group.key]: list.filter((x) => x !== option) };
        }
        if (group.max_select && list.length >= group.max_select) return prev;
        return { ...prev, [group.key]: [...list, option] };
      });
    },
    [answers]
  );

  const atLimit = useCallback(
    (group) =>
      group.type === 'multi' &&
      Boolean(group.max_select) &&
      Array.isArray(answers[group.key]) &&
      answers[group.key].length >= group.max_select,
    [answers]
  );

  return { answers, setAnswers, limitNotices, choose, toggle, setNumber, atLimit };
}

export default function ContributeForm() {
  const router = useRouter();
  const { answers, setAnswers, limitNotices, choose, toggle, setNumber, atLimit } =
    useContributeAnswers();
  const [advice, setAdvice] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Predictive groups exactly as the quiz orders/sections them, with preu
  // overridden to required (see the file-header comment). Recomputed only
  // if the spec identity ever changes — orderedGroups() is a pure read of
  // feature_spec.json, so this is effectively a one-time computation.
  const predictiveGroups = useMemo(
    () =>
      orderedGroups().map((g) =>
        g.key === 'preu' ? { ...g, optional: false, label: en.contribute.preuLabel } : g
      ),
    []
  );
  const outcomeQuestionGroups = useMemo(() => outcomeGroups(), []);
  const allGroups = useMemo(
    () => [...predictiveGroups, ...outcomeQuestionGroups],
    [predictiveGroups, outcomeQuestionGroups]
  );

  function buildAnswers() {
    return { ...answers, advice };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError(null);

    const cleaned = cleanContribution(buildAnswers());
    const { ok, errors: nextErrors } = validateContribution(cleaned);
    setErrors(nextErrors);
    if (!ok) {
      const firstBadKey = allGroups.find((g) => nextErrors[g.key])?.key;
      const target = firstBadKey
        ? document.getElementById(`contribute-${firstBadKey}`)
        : document.getElementById('contribute-advice');
      target?.scrollIntoView({ block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: cleaned }),
      });
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent('/contribute')}`);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSuccess(true);
    } catch {
      setSubmitError(en.contribute.submitError);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setAnswers({});
    setAdvice('');
    setErrors({});
    setSuccess(false);
    setSubmitError(null);
  }

  if (success) {
    return (
      <div className="max-w-[640px]">
        <Kicker>{en.contribute.thanks.kicker}</Kicker>
        <h2 className="font-display mt-6 text-[30px] leading-[1.1] md:text-[42px]">
          {en.contribute.thanks.title}
        </h2>
        <p className="mt-5 max-w-[56ch] text-[15px] leading-[1.6] text-text md:text-base">
          {en.contribute.thanks.body}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <FlowButton href="/explore">{en.contribute.thanks.cta}</FlowButton>
          <button
            type="button"
            onClick={handleReset}
            className={cn(
              'inline-flex min-h-11 items-center justify-center rounded-full border border-hairline px-6',
              'text-sm font-medium text-text/90 transition-colors duration-200',
              'hover:border-text/25 hover:bg-surface-2',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt'
            )}
          >
            {en.contribute.thanks.another}
          </button>
        </div>
      </div>
    );
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-[720px]">
      <StaggerReveal className="flex flex-col gap-10 md:gap-12">
        {allGroups.map((group) => (
          <div key={group.key} id={`contribute-${group.key}`} className="scroll-mt-24">
            <QuestionCard
              group={group}
              value={answers[group.key]}
              atLimit={atLimit(group)}
              limitNotice={limitNotices[group.key] ?? null}
              stepError={errors[group.key]}
              choose={choose}
              toggle={toggle}
              setNumber={setNumber}
            />
          </div>
        ))}

        <div id="contribute-advice" className="scroll-mt-24">
          <Kicker>{en.contribute.adviceKicker}</Kicker>
          <label
            htmlFor="contribute-advice-field"
            className="font-display mt-5 block max-w-[22ch] text-[28px] leading-[1.12] text-text md:text-[40px]"
          >
            {en.contribute.adviceLabel}
          </label>
          <p className="mt-3 max-w-[52ch] text-[14px] text-muted-foreground md:text-[15px]">
            {en.contribute.adviceHint}
          </p>
          <textarea
            id="contribute-advice-field"
            name="advice"
            value={advice}
            onChange={(e) => {
              setAdvice(e.target.value);
              setErrors((prev) => (prev.advice ? { ...prev, advice: null } : prev));
            }}
            minLength={ADVICE_MIN_LENGTH}
            maxLength={ADVICE_MAX_LENGTH}
            rows={5}
            aria-invalid={errors.advice ? true : undefined}
            aria-describedby={errors.advice ? 'contribute-advice-error' : undefined}
            className={cn(
              'mt-6 w-full resize-y rounded-xl border bg-surface p-4 text-[15px] leading-[1.6] text-text',
              'transition-[border-color] duration-200 hover:border-text/25',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt',
              errors.advice ? 'border-danger/70' : 'border-hairline'
            )}
          />
          {errors.advice ? (
            <p
              id="contribute-advice-error"
              role="alert"
              className="mt-2 text-[13px] leading-[1.5] text-danger"
            >
              {errors.advice}
            </p>
          ) : null}
        </div>
      </StaggerReveal>

      <div className="mt-12 flex flex-col gap-4 border-t border-hairline pt-8 md:mt-16">
        <p className="text-[13px] leading-[1.6] text-muted-foreground">
          {en.contribute.reviewNotice}
        </p>
        {hasErrors ? (
          <p role="alert" className="text-[13px] leading-[1.5] text-danger">
            {en.contribute.formErrorSummary}
          </p>
        ) : null}
        {submitError ? (
          <p role="alert" className="text-[13px] leading-[1.5] text-danger">
            {submitError}
          </p>
        ) : null}
        <FlowButton
          onClick={handleSubmit}
          disabled={submitting}
          aria-busy={submitting || undefined}
          className="w-fit min-h-12"
        >
          {submitting ? en.contribute.submitting : en.contribute.submit}
        </FlowButton>
      </div>
    </form>
  );
}
