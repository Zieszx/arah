'use client';

// The answer controls for one question. Every option is a *real*
// <input type="radio|checkbox"> (restyled, sr-only) inside its <label>
// card — native semantics, native keyboard behaviour (arrow keys walk
// radio groups, Space toggles checkboxes), nothing reimplemented on divs.
//
// Options come exclusively from the spec group passed in. The single
// deliberate addition is the pre-U "Not sure yet" card, rendered as a
// first-class option and mapped to the NOT_SURE sentinel — the payload
// builder omits it, which triggers server-side marginalisation.
//
// Selection styling is driven from React state (`checked` is controlled),
// not from CSS sibling selectors, so checked/hover can never fight each
// other in the cascade. The focus ring is the one thing driven from CSS
// (`has-[:focus-visible]`), because focus-visible is knowledge only the
// browser has. Deliberately no `outline-none` anywhere — Tailwind v4's
// outline-none unconditionally sets --tw-outline-style: none and would
// silently kill the ring (see components/arah/FlowButton.jsx).
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NOT_SURE } from '@/lib/quiz/useQuizState';
import { displayLabel } from '@/lib/i18n/labels';
import en from '@/lib/i18n/en';

const CARD_BASE = cn(
  'relative flex min-h-14 cursor-pointer items-center gap-3.5 rounded-xl border bg-surface px-4 py-3.5',
  'text-[15px] leading-snug text-text transition-colors duration-200 select-none',
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-violet-lt'
);

function stateClasses({ checked, unavailable }) {
  if (checked) return 'border-violet bg-violet/10';
  if (unavailable) return 'cursor-not-allowed border-hairline opacity-45';
  return 'border-hairline hover:border-text/25 hover:bg-surface-2 active:bg-surface-2';
}

function Indicator({ multi, checked }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-5 shrink-0 items-center justify-center border transition-colors duration-200',
        multi ? 'rounded-[6px]' : 'rounded-full',
        checked ? 'border-violet bg-violet' : 'border-text/30 bg-transparent'
      )}
    >
      {multi ? (
        <Check
          className={cn('size-3.5 text-white transition-opacity duration-200', checked ? 'opacity-100' : 'opacity-0')}
        />
      ) : (
        <span
          className={cn('size-2 rounded-full bg-white transition-opacity duration-200', checked ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </span>
  );
}

function ChoiceCard({ group, option, multi, checked, unavailable, onPick }) {
  return (
    <label className={cn(CARD_BASE, stateClasses({ checked, unavailable }))}>
      <input
        type={multi ? 'checkbox' : 'radio'}
        name={group.key}
        value={option}
        checked={checked}
        onChange={() => onPick(option)}
        // Not natively disabled — a disabled input is unfocusable and its
        // clicks vanish silently. The hook refuses the change and explains
        // why; aria-disabled tells assistive tech the same thing.
        aria-disabled={unavailable || undefined}
        className="sr-only"
      />
      <Indicator multi={multi} checked={checked} />
      {/* Visible text goes through displayLabel (survey typos corrected);
          the input's `value` above stays the raw spec string — the model
          side must only ever see raw values. */}
      <span>{option === NOT_SURE ? en.quiz.notSure : displayLabel(option)}</span>
    </label>
  );
}

function NumberScale({ group, value, onNumber }) {
  const steps = [];
  for (let n = group.min; n <= group.max; n += 1) steps.push(n);
  return (
    <div>
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {steps.map((n) => {
          const checked = value === n;
          return (
            <label
              key={n}
              className={cn(
                CARD_BASE,
                'min-h-14 justify-center px-0 py-0',
                stateClasses({ checked, unavailable: false })
              )}
            >
              <input
                type="radio"
                name={group.key}
                value={n}
                checked={checked}
                onChange={() => onNumber(n)}
                aria-label={`${n} ${en.quiz.of} ${group.max}`}
                className="sr-only"
              />
              <span aria-hidden="true" className="font-mono text-[15px]">
                {n}
              </span>
            </label>
          );
        })}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-4 text-[13px] text-muted-foreground">
        <span>
          {group.min} — {en.quiz.speakingLow}
        </span>
        <span className="text-right">
          {group.max} — {en.quiz.speakingHigh}
        </span>
      </div>
    </div>
  );
}

export default function OptionGrid({ group, value, atLimit, choose, toggle, setNumber }) {
  if (group.type === 'num') {
    return <NumberScale group={group} value={value} onNumber={(n) => setNumber(group, n)} />;
  }

  const multi = group.type === 'multi';
  const selected = multi ? (Array.isArray(value) ? value : []) : value;
  // The one non-spec option: "Not sure yet", appended for the optional
  // pre-U question only, styled identically to every other card.
  const options = group.optional ? [...group.options, NOT_SURE] : group.options;

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3',
        options.length >= 6 && 'md:grid-cols-2'
      )}
    >
      {options.map((option) => {
        const checked = multi ? selected.includes(option) : selected === option;
        const unavailable = multi && !checked && atLimit;
        return (
          <ChoiceCard
            key={option}
            group={group}
            option={option}
            multi={multi}
            checked={checked}
            unavailable={unavailable}
            onPick={(opt) => (multi ? toggle(group, opt) : choose(group, opt))}
          />
        );
      })}
    </div>
  );
}
